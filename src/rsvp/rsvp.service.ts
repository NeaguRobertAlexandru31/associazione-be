import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RsvpService {
  constructor(private readonly prisma: PrismaService) {}

  async create(eventId: string, dto: { name: string; email?: string; status: string }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento non trovato');

    if (dto.email) {
      const existing = await this.prisma.eventRsvp.findUnique({
        where: { eventId_email: { eventId, email: dto.email } },
      });
      if (existing) throw new ConflictException('Hai già registrato la tua presenza per questo evento');
    }

    return this.prisma.eventRsvp.create({
      data: { eventId, name: dto.name, email: dto.email ?? null, status: dto.status },
    });
  }

  async getStats(eventId: string) {
    const [attending, interested] = await Promise.all([
      this.prisma.eventRsvp.count({ where: { eventId, status: 'attending' } }),
      this.prisma.eventRsvp.count({ where: { eventId, status: 'interested' } }),
    ]);
    return { attending, interested, total: attending + interested };
  }

  async getAll(eventId: string) {
    return this.prisma.eventRsvp.findMany({
      where:   { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
