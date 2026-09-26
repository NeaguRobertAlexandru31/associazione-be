import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  private get appUrl() {
    return process.env.CORS_ORIGIN ?? 'http://localhost:4200';
  }

  async createCheckoutSession(opts: {
    memberId:  string;
    firstName: string;
    lastName:  string;
    email:     string;
    category:  string;
    year:      number;
  }): Promise<string> {
    const categoryAmounts: Record<string, number> = {
      ordinario:   2000,
      under26:     1000,
      sostenitore: 5000,
    };

    const amount = categoryAmounts[opts.category] ?? 2000;

    const session = await this.stripe.checkout.sessions.create({
      mode:               'payment',
      customer_email:     opts.email,
      client_reference_id: opts.memberId,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     'eur',
          unit_amount:  amount,
          product_data: {
            name:        `Tessera ACR ${opts.year} — ${opts.firstName} ${opts.lastName}`,
            description: `Quota associativa categoria ${opts.category}`,
          },
        },
      }],
      success_url: `${this.appUrl}/iscrizione/successo?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${this.appUrl}/iscrizione/annullato`,
      metadata: {
        memberId: opts.memberId,
        year:     String(opts.year),
      },
    });

    return session.url!;
  }

  async createDonationSession(opts: {
    amount:    number;
    frequency: 'once' | 'monthly';
    email?:    string;
  }): Promise<string> {
    const appUrl = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

    if (opts.frequency === 'monthly') {
      const price = await this.stripe.prices.create({
        currency:    'eur',
        unit_amount: Math.round(opts.amount * 100),
        recurring:   { interval: 'month' },
        product_data: { name: 'Donazione mensile ACR' },
      });

      const session = await this.stripe.checkout.sessions.create({
        mode:           'subscription',
        customer_email: opts.email,
        line_items:     [{ price: price.id, quantity: 1 }],
        success_url:    `${appUrl}/donazione/successo?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:     `${appUrl}/donations`,
        metadata:       { type: 'donazione', frequency: 'monthly' },
      });
      return session.url!;
    }

    const session = await this.stripe.checkout.sessions.create({
      mode:           'payment',
      customer_email: opts.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     'eur',
          unit_amount:  Math.round(opts.amount * 100),
          product_data: { name: 'Donazione ACR', description: 'Associazione Culturale Rumena — Milano' },
        },
      }],
      success_url: `${appUrl}/donazione/successo?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/donations`,
      metadata:    { type: 'donazione', frequency: 'once' },
    });
    return session.url!;
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }
}
