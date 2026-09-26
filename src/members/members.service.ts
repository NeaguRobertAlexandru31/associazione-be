import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MailService } from '../mail/mail.service';
import { UpdateSocioDto } from './dto/update-socio.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
    private readonly mail: MailService,
  ) {}

  async getAll() {
    const members = await this.prisma.member.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        category: true,
        status: true,
        membershipYear: true,
        profileImage: true,
        boardRoles: true,
        pagePermissions: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });

    const direttivo = members.filter(m => m.role !== UserRole.MEMBER);
    const soci      = members.filter(m => m.role === UserRole.MEMBER);

    return { direttivo, soci };
  }

  async getMember(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
      include: { guardian: true },
    });
    if (!member) throw new NotFoundException('Socio non trovato');

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = member as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian as any;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async updateMember(requestingRole: UserRole, id: string, dto: UpdateSocioDto) {
    if (requestingRole !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può modificare i soci');

    const member = await this.prisma.member.findUnique({ where: { id, deletedAt: null } });
    if (!member) throw new NotFoundException('Socio non trovato');

    const raw: Record<string, unknown> = { ...dto };
    if (dto.birthDate) raw.birthDate = new Date(dto.birthDate);
    if (dto.docExpiry) raw.docExpiry = new Date(dto.docExpiry);

    const data = this.enc.encryptMember(raw);
    const updated = await this.prisma.member.update({
      where: { id },
      data,
      include: { guardian: true },
    });

    if (dto.status && dto.status !== member.status) {
      if (dto.status === 'attivo') {
        this.mail.sendApproved({
          firstName: updated.firstName,
          lastName:  updated.lastName,
          email:     updated.email,
          category:  updated.category,
          year:      updated.membershipYear ?? new Date().getFullYear(),
        }).catch(() => {});
      } else if (dto.status === 'rifiutato') {
        this.mail.sendRejected({
          firstName: updated.firstName,
          lastName:  updated.lastName,
          email:     updated.email,
          year:      updated.membershipYear ?? new Date().getFullYear(),
        }).catch(() => {});
      }
    }

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = updated as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian as any;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async deleteMember(requestingRole: UserRole, id: string) {
    if (requestingRole !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può eliminare i soci');

    const member = await this.prisma.member.findUnique({ where: { id, deletedAt: null } });
    if (!member) throw new NotFoundException('Socio non trovato');

    await this.prisma.member.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getDonationStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [all, month] = await Promise.all([
      this.prisma.donation.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      this.prisma.donation.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      count:          all._count.id,
      total:          Number(all._sum.amount ?? 0),
      thisMonthCount: month._count.id,
      thisMonthTotal: Number(month._sum.amount ?? 0),
    };
  }
}
