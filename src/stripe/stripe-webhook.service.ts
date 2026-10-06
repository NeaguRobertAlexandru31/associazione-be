import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async handle(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripe.constructEvent(payload, signature);

    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object as {
      id?: string;
      metadata?: { memberId?: string; type?: string; frequency?: string };
      payment_status?: string;
      mode?: string;
      amount_total?: number;
      customer_email?: string;
      customer_details?: { name?: string; email?: string };
    };

    this.logger.log(
      `Webhook session: payment_status=${session.payment_status} mode=${session.mode} metadata=${JSON.stringify(session.metadata)}`,
    );

    const { memberId, type, frequency } = session.metadata ?? {};

    this.logger.log(
      `Webhook tipo=${type} memberId=${memberId} frequency=${frequency}`,
    );

    if (type === 'donazione') {
      // subscription: payment_status è 'no_payment_needed' al primo evento
      await this.handleDonation(session, frequency ?? 'once');
      return;
    }

    // quota associativa: richiede pagamento confermato
    if (session.payment_status !== 'paid') return;

    if (memberId) {
      await this.handleMemberPayment(memberId);
    }
  }

  private async handleMemberPayment(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId, deletedAt: null },
    });
    if (!member) {
      this.logger.warn(`Webhook: membro ${memberId} non trovato`);
      return;
    }

    await this.prisma.member.update({
      where: { id: memberId },
      data: { status: 'attivo' },
    });

    this.mail
      .sendApproved({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        category: member.category,
        year: member.membershipYear ?? new Date().getFullYear(),
      })
      .catch(() => {});

    this.logger.log(`Pagamento confermato — membro ${memberId} attivato`);
  }

  private async handleDonation(
    session: {
      id?: string;
      amount_total?: number;
      customer_email?: string;
      customer_details?: { name?: string; email?: string };
      metadata?: { memberId?: string };
    },
    frequency: string,
  ): Promise<void> {
    const amount = (session.amount_total ?? 0) / 100;
    const email = session.customer_details?.email ?? session.customer_email;
    const name = session.customer_details?.name ?? 'Donatore';
    const memberId = session.metadata?.memberId;

    const existing = session.id
      ? await this.prisma.donation.findFirst({ where: { stripeSessionId: session.id } })
      : null;
    if (existing) {
      this.logger.warn(`Donazione già registrata per sessione ${session.id}, skip`);
      return;
    }

    await this.prisma.donation.create({
      data: {
        amount,
        frequency: frequency === 'monthly' ? 'monthly' : 'once',
        method: 'card',
        donorName: name,
        donorEmail: email,
        stripeSessionId: session.id ?? null,
        memberId: memberId ?? null,
      },
    });

    if (email) {
      this.mail
        .sendDonationReceipt({ email, name, amount, frequency })
        .catch(() => {});
    }

    this.logger.log(`Donazione registrata — ${amount}€ da ${email}`);
  }
}
