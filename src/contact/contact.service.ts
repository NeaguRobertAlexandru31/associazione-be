import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  create(dto: CreateContactDto) {
    return this.prisma.contactMessage.create({ data: dto });
  }

  findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  unreadCount() {
    return this.prisma.contactMessage.count({ where: { read: false } });
  }

  markRead(id: string) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });
  }

  deleteMany(ids: string[]) {
    return this.prisma.contactMessage.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async reply(id: string, adminName: string, adminEmail: string, message: string) {
    const contact = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Messaggio non trovato');

    await this.mail.sendReply({
      fromName:  adminName,
      fromEmail: adminEmail,
      toEmail:   contact.email,
      toName:    contact.name,
      subject:   contact.subject ? `Re: ${contact.subject}` : 'Risposta al tuo messaggio',
      message,
    });
  }
}
