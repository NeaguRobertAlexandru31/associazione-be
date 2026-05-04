import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivityDto {
  id:    string;
  type:  string;
  icon:  string;
  text:  string;
  color: string;
  date:  string;
}

const LOOKBACK_DAYS = 30;
const MAX_ITEMS = 20;
const UPDATE_THRESHOLD_MS = 5 * 60 * 1000;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecent(): Promise<ActivityDto[]> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const items: ActivityDto[] = [];

    const [members, events, articles, donations, messages, subscribers] =
      await Promise.all([
        this.prisma.member.findMany({
          where: {
            OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.event.findMany({
          where: {
            OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
          },
          select: { id: true, name: true, createdAt: true, updatedAt: true },
        }),
        this.prisma.article.findMany({
          where: {
            OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
          },
          select: { id: true, name: true, createdAt: true, updatedAt: true },
        }),
        this.prisma.donation.findMany({
          where: { createdAt: { gte: since } },
          select: { id: true, donorName: true, amount: true, createdAt: true },
        }),
        this.prisma.contactMessage.findMany({
          where: { createdAt: { gte: since } },
          select: { id: true, name: true, createdAt: true },
        }),
        this.prisma.newsletterSubscriber.findMany({
          where: { createdAt: { gte: since } },
          select: { id: true, email: true, createdAt: true },
        }),
      ]);

    for (const m of members) {
      if (m.createdAt >= since) {
        items.push({
          id:    `member_registered_${m.id}`,
          type:  'member_registered',
          icon:  'person_add',
          text:  `Nuova iscrizione: ${m.firstName} ${m.lastName}`,
          color: 'text-primary',
          date:  m.createdAt.toISOString(),
        });
      }
      if (
        m.status === 'attivo' &&
        m.updatedAt.getTime() - m.createdAt.getTime() > UPDATE_THRESHOLD_MS &&
        m.updatedAt >= since
      ) {
        items.push({
          id:    `member_activated_${m.id}`,
          type:  'member_activated',
          icon:  'how_to_reg',
          text:  `${m.firstName} ${m.lastName} è diventato socio`,
          color: 'text-primary',
          date:  m.updatedAt.toISOString(),
        });
      }
    }

    for (const e of events) {
      if (e.createdAt >= since) {
        items.push({
          id:    `event_created_${e.id}`,
          type:  'event_created',
          icon:  'event',
          text:  `Nuovo evento: ${e.name}`,
          color: 'text-secondary',
          date:  e.createdAt.toISOString(),
        });
      }
      if (
        e.updatedAt.getTime() - e.createdAt.getTime() > UPDATE_THRESHOLD_MS &&
        e.updatedAt >= since
      ) {
        items.push({
          id:    `event_updated_${e.id}`,
          type:  'event_updated',
          icon:  'edit_calendar',
          text:  `Evento aggiornato: ${e.name}`,
          color: 'text-secondary',
          date:  e.updatedAt.toISOString(),
        });
      }
    }

    for (const a of articles) {
      if (a.createdAt >= since) {
        items.push({
          id:    `article_published_${a.id}`,
          type:  'article_published',
          icon:  'newspaper',
          text:  `Articolo pubblicato: ${a.name}`,
          color: 'text-on-surface-variant',
          date:  a.createdAt.toISOString(),
        });
      }
      if (
        a.updatedAt.getTime() - a.createdAt.getTime() > UPDATE_THRESHOLD_MS &&
        a.updatedAt >= since
      ) {
        items.push({
          id:    `article_updated_${a.id}`,
          type:  'article_updated',
          icon:  'edit_note',
          text:  `Articolo aggiornato: ${a.name}`,
          color: 'text-on-surface-variant',
          date:  a.updatedAt.toISOString(),
        });
      }
    }

    for (const d of donations) {
      items.push({
        id:    `donation_${d.id}`,
        type:  'donation',
        icon:  'volunteer_activism',
        text:  `Donazione €${Number(d.amount)} da ${d.donorName ?? 'Anonimo'}`,
        color: 'text-primary',
        date:  d.createdAt.toISOString(),
      });
    }

    for (const c of messages) {
      items.push({
        id:    `contact_message_${c.id}`,
        type:  'contact_message',
        icon:  'mail',
        text:  `Nuovo messaggio da ${c.name}`,
        color: 'text-secondary',
        date:  c.createdAt.toISOString(),
      });
    }

    for (const n of subscribers) {
      items.push({
        id:    `newsletter_${n.id}`,
        type:  'newsletter',
        icon:  'mark_email_read',
        text:  `Nuova iscrizione newsletter: ${n.email}`,
        color: 'text-on-surface-variant',
        date:  n.createdAt.toISOString(),
      });
    }

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_ITEMS);
  }
}
