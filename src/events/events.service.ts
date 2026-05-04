import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { CreateEventDto } from './dto/create-event.dto';

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
} as const;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2:     R2Service,
  ) {}

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
    const events = await this.prisma.event.findMany({ where: { slug: null }, select: { id: true, name: true } });
    for (const e of events) {
      await this.prisma.event.update({
        where: { id: e.id },
        data: { slug: `${slugify(e.name)}-${e.id.slice(0, 8)}` },
      });
    }
  }

  create(dto: CreateEventDto) {
    const id   = randomUUID();
    const slug = `${slugify(dto.name)}-${id.slice(0, 8)}`;

    return this.prisma.event.create({
      data: {
        id,
        slug,
        name:        dto.name,
        date:        new Date(dto.date),
        time:        dto.time,
        location:    dto.location,
        description: dto.description,
        images:      dto.images ?? [],
      },
      select: EVENT_SELECT,
    });
  }

  async delete(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento non trovato');
    await this.r2.deleteMany(event.images);
    return this.prisma.event.delete({ where: { id } });
  }
}
