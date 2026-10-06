import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateEventDto, EventAccessType } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const EVENT_SELECT = {
  id: true,
  slug: true,
  name: true,
  date: true,
  time: true,
  location: true,
  description: true,
  images: true,
  cover: true,
  uploadToken: true,
  uploadUrl: true,
  accessType: true,
  hasCapacity: true,
  capacity: true,
} as const;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: S3Service,
    private readonly telegram: TelegramService,
  ) {}

  private buildEventNotify(event: { name: string; date: Date; time: string; location: string; description?: string | null; slug: string | null; accessType: string; cover?: string | null }) {
    const dateStr = event.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const appUrl  = process.env.APP_PUBLIC_URL ?? 'https://acr-milano.it';
    const accessLabel: Record<string, string> = {
      public:       '🌐 Pubblico',
      limited:      '🎟 A numero chiuso',
      members_only: '👥 Solo soci',
    };
    return {
      title: `📅 Nuovo evento!`,
      cover: event.cover,
      description: event.description,
      link: `${appUrl}/events/${event.slug}`,
      lines: [
        `*${event.name}*`,
        `📆 ${dateStr} alle ${event.time}`,
        `📍 ${event.location}`,
        accessLabel[event.accessType] ?? '',
      ],
    };
  }

  getAll() {
    return this.prisma.event.findMany({
      select: EVENT_SELECT,
      orderBy: { date: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: EVENT_SELECT,
    });
    if (!event) throw new NotFoundException('Evento non trovato');
    return event;
  }

  async backfillSlugs() {
    const events = await this.prisma.event.findMany({
      where: { slug: null },
      select: { id: true, name: true },
    });
    for (const e of events) {
      await this.prisma.event.update({
        where: { id: e.id },
        data: { slug: `${slugify(e.name)}-${e.id.slice(0, 8)}` },
      });
    }
  }

  async create(dto: CreateEventDto) {
    const id = randomUUID();
    const slug = `${slugify(dto.name)}-${id.slice(0, 8)}`;
    const accessType = dto.accessType ?? EventAccessType.public;
    const hasCapacity = accessType === EventAccessType.limited;

    const event = await this.prisma.event.create({
      data: {
        id,
        slug,
        name: dto.name,
        date: new Date(dto.date),
        time: dto.time,
        location: dto.location,
        description: dto.description,
        images: dto.images ?? [],
        cover: dto.cover,
        accessType,
        hasCapacity,
        capacity: hasCapacity ? (dto.capacity ?? null) : null,
      },
      select: EVENT_SELECT,
    });

    this.telegram.notify(this.buildEventNotify({ ...event, date: new Date(event.date) }))
      .catch(err => this.logger.error('Telegram notify failed', err));

    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evento non trovato');

    const accessType = dto.accessType ?? existing.accessType;
    const hasCapacity = accessType === EventAccessType.limited;

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.time !== undefined && { time: dto.time }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.cover !== undefined && { cover: dto.cover }),
        ...(dto.accessType !== undefined && { accessType, hasCapacity }),
        ...(hasCapacity && dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(!hasCapacity && { capacity: null }),
      },
      select: EVENT_SELECT,
    });
  }

  async delete(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento non trovato');
    const toDelete = [...event.images];
    if (event.cover) toDelete.push(event.cover);
    await this.r2.deleteMany(toDelete);
    return this.prisma.event.delete({ where: { id } });
  }
}
