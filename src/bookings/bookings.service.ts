import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

const MAX_SEATS_PER_BOOKING = 4;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly s3: S3Service,
  ) {}

  private async uploadQr(bookingId: string, seat?: number): Promise<string> {
    const payload = seat != null ? `${bookingId}|${seat}` : bookingId;
    const key = seat != null ? `booking-qr/${bookingId}-${seat}.png` : `booking-qr/${bookingId}.png`;
    const buffer = await QRCode.toBuffer(payload, {
      type: 'png',
      width: 300,
      margin: 1,
      color: { dark: '#002068', light: '#ffffff' },
    });
    return this.s3.upload(key, buffer, 'image/png');
  }

  private async uploadQrAll(bookingId: string, seats: number): Promise<string[]> {
    return Promise.all(
      Array.from({ length: seats }, (_, i) => this.uploadQr(bookingId, i + 1)),
    );
  }

  async book(slug: string, dto: { name: string; email: string; phone?: string; seats: number; guests?: { name: string; email?: string; phone?: string }[] }) {
    if (dto.seats < 1 || dto.seats > MAX_SEATS_PER_BOOKING) {
      throw new BadRequestException(`Puoi prenotare da 1 a ${MAX_SEATS_PER_BOOKING} posti per prenotazione`);
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, name: true, date: true, time: true, location: true, hasCapacity: true, capacity: true, accessType: true },
    });
    if (!event) throw new NotFoundException('Evento non trovato');
    if (!event.hasCapacity && event.accessType !== 'members_only') throw new BadRequestException('Questo evento non richiede prenotazione');

    if (event.accessType === 'members_only') {
      const member = await this.prisma.member.findFirst({
        where: { email: dto.email, status: 'attivo', deletedAt: null },
        select: { id: true },
      });
      if (!member) throw new BadRequestException('Email non associata a un socio attivo');
    }

    const confirmedSeats = await this.prisma.booking.aggregate({
      where: { eventId: event.id, status: 'confirmed' },
      _sum: { seats: true },
    });
    const occupied = confirmedSeats._sum.seats ?? 0;
    const available = event.capacity != null ? event.capacity - occupied : Infinity;

    if (available >= dto.seats) {
      // Prenotazione confermata
      const booking = await this.prisma.booking.create({
        data: {
          eventId: event.id,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          seats: dto.seats,
          guests: dto.guests ?? [],
          status: 'confirmed',
        },
      });

      this.uploadQrAll(booking.id, booking.seats)
        .then(qrUrls => this.mail.sendBookingConfirmation({ booking, event, qrUrls }))
        .catch(err => this.logger.error('sendBookingConfirmation failed', err));

      return { status: 'confirmed', bookingId: booking.id, cancelToken: booking.cancelToken };
    } else {
      // Lista d'attesa
      const lastWaitlist = await this.prisma.booking.findFirst({
        where: { eventId: event.id, status: 'waitlist' },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (lastWaitlist?.position ?? 0) + 1;

      const booking = await this.prisma.booking.create({
        data: {
          eventId: event.id,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          seats: dto.seats,
          guests: dto.guests ?? [],
          status: 'waitlist',
          position,
        },
      });

      this.mail.sendBookingWaitlist({
        booking,
        event,
        position,
      }).catch(err => this.logger.error('sendBookingWaitlist failed', err));

      return { status: 'waitlist', position, bookingId: booking.id };
    }
  }

  async cancel(cancelToken: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { cancelToken },
      include: { event: { select: { id: true, name: true, date: true, time: true, location: true, capacity: true } } },
    });
    if (!booking) throw new NotFoundException('Prenotazione non trovata');
    if (booking.status === 'cancelled') throw new BadRequestException('Prenotazione già annullata');

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    // Se era confermata, promuovi il primo in lista d'attesa
    if (booking.status === 'confirmed') {
      await this.promoteWaitlist(booking.event, booking.seats);
    }

    return { cancelled: true };
  }

  private async promoteWaitlist(
    event: { id: string; name: string; date: Date; time: string; location: string; capacity: number | null },
    freedSeats: number,
  ) {
    // Ricalcola posti disponibili dopo la cancellazione
    const confirmedSeats = await this.prisma.booking.aggregate({
      where: { eventId: event.id, status: 'confirmed' },
      _sum: { seats: true },
    });
    let available = (event.capacity ?? 0) - (confirmedSeats._sum.seats ?? 0);

    const waitlist = await this.prisma.booking.findMany({
      where: { eventId: event.id, status: 'waitlist' },
      orderBy: { position: 'asc' },
    });

    for (const w of waitlist) {
      if (available <= 0) break;
      if (w.seats > available) continue;

      await this.prisma.booking.update({
        where: { id: w.id },
        data: { status: 'confirmed', position: null },
      });
      available -= w.seats;

      this.uploadQrAll(w.id, w.seats)
        .then(qrUrls => this.mail.sendBookingConfirmation({ booking: w, event, qrUrls }))
        .catch(err => this.logger.error('sendBookingConfirmation (promoted) failed', err));
    }

    // Riassegna posizioni nella waitlist rimasta
    const remaining = await this.prisma.booking.findMany({
      where: { eventId: event.id, status: 'waitlist' },
      orderBy: { position: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      await this.prisma.booking.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 },
      });
    }
  }

  async getBookings(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true, capacity: true } });
    if (!event) throw new NotFoundException('Evento non trovato');

    const [bookings, confirmedSeats] = await Promise.all([
      this.prisma.booking.findMany({
        where: { eventId: event.id, status: { not: 'cancelled' } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.booking.aggregate({
        where: { eventId: event.id, status: 'confirmed' },
        _sum: { seats: true },
      }),
    ]);

    const occupied = confirmedSeats._sum.seats ?? 0;
    return {
      bookings,
      capacity: event.capacity,
      occupied,
      available: Math.max(0, (event.capacity ?? 0) - occupied),
    };
  }

  async verify(raw: string) {
    const bookingId = raw.split('|')[0];
    const seatNum = raw.includes('|') ? Number(raw.split('|')[1]) : null;
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: { select: { name: true, date: true, time: true, location: true } } },
    });
    if (!booking) throw new NotFoundException('Prenotazione non trovata');
    return {
      valid: booking.status === 'confirmed',
      id: booking.id,
      name: booking.name,
      email: booking.email,
      seats: booking.seats,
      seatNum,
      status: booking.status,
      eventId: booking.eventId,
      eventName: booking.event.name,
      eventDate: booking.event.date,
      eventTime: booking.event.time,
      eventLocation: booking.event.location,
      createdAt: booking.createdAt,
    };
  }

  async getAvailability(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { hasCapacity: true, capacity: true, id: true },
    });
    if (!event) throw new NotFoundException('Evento non trovato');
    if (!event.hasCapacity) return { hasCapacity: false };

    const confirmedSeats = await this.prisma.booking.aggregate({
      where: { eventId: event.id, status: 'confirmed' },
      _sum: { seats: true },
    });
    const occupied = confirmedSeats._sum.seats ?? 0;
    const available = Math.max(0, (event.capacity ?? 0) - occupied);

    const waitlistCount = await this.prisma.booking.count({
      where: { eventId: event.id, status: 'waitlist' },
    });

    return { hasCapacity: true, capacity: event.capacity, available, waitlistCount };
  }
}
