import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORY_AMOUNTS: Record<string, number> = {
  ordinario:   20,
  under26:     10,
  sostenitore: 50,
};

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [donations, paidMembers] = await Promise.all([
      this.prisma.donation.findMany({
        orderBy: { createdAt: 'desc' },
        include: { member: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.member.findMany({
        where: { status: 'attivo', paymentMethod: 'online', deletedAt: null },
        select: {
          id: true, firstName: true, lastName: true,
          category: true, membershipYear: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const donationTotal      = donations.reduce((s, d) => s + Number(d.amount), 0);
    const donationMonthTotal = donations
      .filter(d => new Date(d.createdAt) >= startOfMonth)
      .reduce((s, d) => s + Number(d.amount), 0);

    const quoteTotal      = paidMembers.reduce((s, m) => s + (CATEGORY_AMOUNTS[m.category] ?? 0), 0);
    const quoteMonthTotal = paidMembers
      .filter(m => new Date(m.createdAt) >= startOfMonth)
      .reduce((s, m) => s + (CATEGORY_AMOUNTS[m.category] ?? 0), 0);

    const transactions = [
      ...donations.map(d => ({
        id:        d.id,
        type:      'donazione' as const,
        amount:    Number(d.amount),
        name:      d.donorName ?? (d.member ? `${d.member.firstName} ${d.member.lastName}` : 'Anonimo'),
        email:     d.donorEmail ?? null,
        method:    d.method,
        createdAt: d.createdAt,
      })),
      ...paidMembers.map(m => ({
        id:        `quota_${m.id}`,
        type:      'quota' as const,
        amount:    CATEGORY_AMOUNTS[m.category] ?? 0,
        name:      `${m.firstName} ${m.lastName}`,
        email:     null,
        method:    'online',
        category:  m.category,
        year:      m.membershipYear,
        createdAt: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      totale:           donationTotal + quoteTotal,
      totaleQuote:      quoteTotal,
      totaleDonazioni:  donationTotal,
      questoMese:       donationMonthTotal + quoteMonthTotal,
      transactions,
    };
  }
}
