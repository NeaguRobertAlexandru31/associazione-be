import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { TelegramService } from '../telegram/telegram.service';
import { WatermarkService } from '../watermark/watermark.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');

const PHOTO_LIMIT_PER_EVENT = 100;
const PHOTO_LIMIT_PER_USER = 10;
// Tre giorni dopo la data dell'evento
const UPLOAD_WINDOW_DAYS = 3;

interface UploadTokenPayload {
  sub: string; // eventId
  exp: number;
}

@Injectable()
export class EventPhotosService {
  private readonly logger = new Logger(EventPhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: S3Service,
    private readonly jwt: JwtService,
    private readonly watermark: WatermarkService,
    private readonly mail: MailService,
    private readonly telegram: TelegramService,
  ) {}

  async generateUploadToken(slug: string, force = false): Promise<{ token: string; uploadUrl: string }> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, date: true, uploadToken: true, uploadUrl: true },
    });
    if (!event) throw new NotFoundException('Evento non trovato');

    if (!force && event.uploadToken && event.uploadUrl) {
      try {
        this.jwt.verify(event.uploadToken);
        return { token: event.uploadToken, uploadUrl: event.uploadUrl };
      } catch {
        // token scaduto — ne genero uno nuovo
      }
    }

    return this.generateTokenForNewEvent(event.id, slug, new Date(event.date));
  }

  async generateTokenForNewEvent(eventId: string, slug: string, eventDate: Date): Promise<{ token: string; uploadUrl: string }> {
    const now = Math.floor(Date.now() / 1000);
    const eventExp = Math.floor((eventDate.getTime() + UPLOAD_WINDOW_DAYS * 86_400_000) / 1000);
    // Se l'evento è futuro: scade 3 giorni dopo la data evento
    // Se l'evento è oggi o passato: scade 3 giorni da adesso
    const expiresIn = eventExp > now
      ? eventExp - now
      : UPLOAD_WINDOW_DAYS * 86_400;
    const token = this.jwt.sign({ sub: eventId }, { expiresIn });
    const uploadUrl = `/events/${slug}/upload?token=${token}`;

    await this.prisma.event.update({
      where: { id: eventId },
      data: { uploadToken: token, uploadUrl },
    });

    return { token, uploadUrl };
  }

  async presignUploads(
    slug: string,
    rawToken: string,
    files: { name: string; type: string }[],
    uploaderName: string,
    uploaderEmail?: string,
  ): Promise<{ presignedUrls: { uploadUrl: string; key: string }[] }> {
    let payload: UploadTokenPayload;
    try {
      payload = this.jwt.verify<UploadTokenPayload>(rawToken);
    } catch {
      throw new UnauthorizedException('Token non valido o scaduto');
    }

    if (!uploaderName?.trim()) throw new BadRequestException('Il nome è obbligatorio');

    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true, date: true } });
    if (!event) throw new NotFoundException('Evento non trovato');
    if (event.id !== payload.sub) throw new UnauthorizedException('Token non valido per questo evento');

    const today = new Date().toISOString().slice(0, 10);
    const eventDay = new Date(event.date).toISOString().slice(0, 10);
    if (eventDay > today) throw new BadRequestException('Le foto possono essere caricate solo dal giorno dell\'evento');

    const totalExisting = await this.prisma.eventPhoto.count({ where: { eventId: event.id } });
    if (totalExisting >= PHOTO_LIMIT_PER_EVENT)
      throw new BadRequestException(`Limite massimo di ${PHOTO_LIMIT_PER_EVENT} foto raggiunto`);

    const email = uploaderEmail?.trim().toLowerCase() || null;
    const userExisting = email
      ? await this.prisma.eventPhoto.count({ where: { eventId: event.id, uploaderEmail: email } })
      : await this.prisma.eventPhoto.count({ where: { eventId: event.id, tokenSub: payload.sub } });
    const remaining = Math.min(
      PHOTO_LIMIT_PER_USER - userExisting,
      PHOTO_LIMIT_PER_EVENT - totalExisting,
    );
    if (remaining <= 0)
      throw new BadRequestException(`Hai già caricato il massimo di ${PHOTO_LIMIT_PER_USER} foto per questo evento`);

    const toProcess = files.slice(0, remaining);
    const presignedUrls = await Promise.all(
      toProcess.map(async (f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const contentType = f.type || 'image/jpeg';
        const key = `event-photos-raw/${event.id}/${randomBytes(10).toString('hex')}.${ext}`;
        const uploadUrl = await this.r2.presignedPut(key, contentType, 600);
        return { uploadUrl, key };
      }),
    );

    return { presignedUrls };
  }

  async confirmUploads(
    slug: string,
    rawToken: string,
    keys: string[],
    uploaderName: string,
    uploaderEmail?: string,
  ): Promise<{ uploaded: number }> {
    let payload: UploadTokenPayload;
    try {
      payload = this.jwt.verify<UploadTokenPayload>(rawToken);
    } catch {
      throw new UnauthorizedException('Token non valido o scaduto');
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, name: true, date: true },
    });
    if (!event) throw new NotFoundException('Evento non trovato');
    if (event.id !== payload.sub) throw new UnauthorizedException('Token non valido per questo evento');

    if (!keys?.length) throw new BadRequestException('Nessuna chiave ricevuta');

    const email = uploaderEmail?.trim().toLowerCase() || null;
    const isMember = email ? !!(await this.prisma.member.findFirst({
      where: { email, status: 'attivo' }, select: { id: true },
    })) : false;

    // Scarica da S3, applica watermark, ri-carica in percorso definitivo
    const urls = await Promise.all(
      keys.map(async (key) => {
        const rawBuf = await this.r2.download(key);
        let buf = await sharp(rawBuf)
          .rotate()
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        buf = await this.watermark.apply(buf);
        const finalKey = `event-photos/${event.id}/${randomBytes(10).toString('hex')}.webp`;
        const url = await this.r2.upload(finalKey, buf);
        // Rimuove il file raw temporaneo
        await this.r2.delete(key).catch(() => {});
        return url;
      }),
    );

    await this.prisma.eventPhoto.createMany({
      data: urls.map((url) => ({
        eventId: event.id,
        url,
        approved: true,
        tokenSub: payload.sub,
        uploaderName: uploaderName.trim(),
        uploaderEmail: email ?? null,
        isMember,
      })),
    });

    this.mail.sendPhotoUploadAlert({
      uploaderName: uploaderName.trim(),
      uploaderEmail: email,
      isMember,
      eventName: event.name,
      eventDate: event.date.toISOString(),
      uploaded: urls.length,
      dashboardUrl: `${process.env.CORS_ORIGIN ?? 'https://acr-milano.it'}/dashboard/events`,
    }).catch(err => this.logger.error('sendPhotoUploadAlert failed', err));

    const appUrl = process.env.APP_PUBLIC_URL ?? 'https://acr-milano.it';
    const photoCount = urls.length === 1 ? 'una foto' : `${urls.length} foto`;
    const memberBadge = isMember ? ' ⭐ socio' : '';
    this.telegram.notify({
      title: `📸 Nuove foto dall'evento!`,
      cover: urls[0],
      lines: [
        `*${uploaderName.trim()}*${memberBadge} ha condiviso ${photoCount} con noi!`,
        `🎉 *${event.name}*`,
      ],
      link: `${appUrl}/dashboard/events/${slug}`,
    }).catch(err => this.logger.error('Telegram photo notify failed', err));

    if (email) {
      this.sendThankYouEmail({
        name: uploaderName.trim(), email, eventName: event.name,
        eventDate: event.date.toISOString(), uploaded: urls.length, isMember,
      }).catch(err => this.logger.error('sendThankYouEmail failed', err));
    }

    return { uploaded: urls.length };
  }

  async uploadPhotos(
    slug: string,
    rawToken: string,
    files: Express.Multer.File[],
    uploaderName: string,
    uploaderEmail: string,
  ): Promise<{ uploaded: number }> {
    let payload: UploadTokenPayload;
    try {
      payload = this.jwt.verify<UploadTokenPayload>(rawToken);
    } catch {
      throw new UnauthorizedException('Token non valido o scaduto');
    }

    if (!uploaderName?.trim()) {
      throw new BadRequestException('Il nome è obbligatorio');
    }

    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) throw new NotFoundException('Evento non trovato');
    if (event.id !== payload.sub) throw new UnauthorizedException('Token non valido per questo evento');

    if (!files || files.length === 0) throw new BadRequestException('Nessun file ricevuto');

    const email = uploaderEmail?.trim().toLowerCase() || null;

    // Controllo limite per evento
    const totalExisting = await this.prisma.eventPhoto.count({ where: { eventId: event.id } });
    if (totalExisting >= PHOTO_LIMIT_PER_EVENT) {
      throw new BadRequestException(`Limite massimo di ${PHOTO_LIMIT_PER_EVENT} foto per evento raggiunto`);
    }

    // Controllo limite per utente: per email se fornita, altrimenti per tokenSub
    const userExisting = email
      ? await this.prisma.eventPhoto.count({ where: { eventId: event.id, uploaderEmail: email } })
      : await this.prisma.eventPhoto.count({ where: { eventId: event.id, tokenSub: payload.sub } });
    const userRemaining = PHOTO_LIMIT_PER_USER - userExisting;
    if (userRemaining <= 0) {
      throw new BadRequestException(`Hai già caricato il massimo di ${PHOTO_LIMIT_PER_USER} foto per questo evento`);
    }

    // Verifica socio solo se email fornita
    const isMember = email ? !!(await this.prisma.member.findFirst({
      where: { email, status: 'attivo' },
      select: { id: true },
    })) : false;

    const remaining = Math.min(userRemaining, PHOTO_LIMIT_PER_EVENT - totalExisting);
    const toProcess = files.slice(0, remaining);

    const urls = await Promise.all(
      toProcess.map(async (file) => {
        let buf = await sharp(file.buffer)
          .rotate()
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        buf = await this.watermark.apply(buf);
        const key = `event-photos/${event.id}/${randomBytes(10).toString('hex')}.webp`;
        return this.r2.upload(key, buf);
      }),
    );

    const eventRecord = await this.prisma.event.findUnique({
      where: { slug },
      select: { name: true, date: true },
    });

    await this.prisma.eventPhoto.createMany({
      data: urls.map((url) => ({
        eventId: event.id,
        url,
        approved: true,
        tokenSub: payload.sub,
        uploaderName: uploaderName.trim(),
        uploaderEmail: email ?? null,
        isMember,
      })),
    });

    // Invia email in background (non blocca la risposta)
    if (eventRecord) {
      const emailOpts = {
        name: uploaderName.trim(),
        email: email ?? null,
        eventName: eventRecord.name,
        eventDate: eventRecord.date.toISOString(),
        uploaded: urls.length,
        isMember,
      };

      // Notifica admin sempre
      this.mail.sendPhotoUploadAlert({
        uploaderName: emailOpts.name,
        uploaderEmail: emailOpts.email,
        isMember: emailOpts.isMember,
        eventName: emailOpts.eventName,
        eventDate: emailOpts.eventDate,
        uploaded: emailOpts.uploaded,
        dashboardUrl: `${process.env.CORS_ORIGIN ?? 'https://acr-milano.it'}/dashboard/events`,
      }).catch(err => this.logger.error('sendPhotoUploadAlert failed', err));

      const appUrl2 = process.env.APP_PUBLIC_URL ?? 'https://acr-milano.it';
      const photoCount2 = emailOpts.uploaded === 1 ? 'una foto' : `${emailOpts.uploaded} foto`;
      const memberBadge2 = emailOpts.isMember ? ' ⭐ socio' : '';
      this.telegram.notify({
        title: `📸 Nuove foto dall'evento!`,
        cover: urls[0],
        lines: [
          `*${emailOpts.name}*${memberBadge2} ha condiviso ${photoCount2} con noi!`,
          `🎉 *${emailOpts.eventName}*`,
        ],
        link: `${appUrl2}/dashboard/events/${slug}`,
      }).catch(err => this.logger.error('Telegram photo notify failed', err));

      // Ringraziamento all'utente solo se ha fornito l'email
      if (email) {
        this.sendThankYouEmail({ ...emailOpts, email })
          .catch(err => this.logger.error('sendThankYouEmail failed', err));
      }
    }

    return { uploaded: urls.length };
  }

  private async sendThankYouEmail(opts: {
    name: string;
    email: string;
    eventName: string;
    eventDate: string;
    uploaded: number;
    isMember: boolean;
  }): Promise<void> {
    const base = process.env.CORS_ORIGIN ?? 'https://acr-milano.it';
    await this.mail.sendPhotoThankYou({
      ...opts,
      membershipUrl: `${base}/iscrizione`,
      donationUrl: `${base}/donations`,
    });
  }

  async getPhotos(slug: string, approvedOnly = false) {
    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) throw new NotFoundException('Evento non trovato');

    return this.prisma.eventPhoto.findMany({
      where: { eventId: event.id, ...(approvedOnly ? { approved: true } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, approved: true, isMember: true, uploaderName: true, uploaderEmail: true, createdAt: true },
    });
  }

  async approvePhoto(photoId: string) {
    const photo = await this.prisma.eventPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto non trovata');
    return this.prisma.eventPhoto.update({ where: { id: photoId }, data: { approved: true } });
  }

  async deletePhoto(photoId: string) {
    const photo = await this.prisma.eventPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto non trovata');
    await this.r2.delete(photo.url);
    await this.prisma.eventPhoto.delete({ where: { id: photoId } });
  }
}
