import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MailService } from '../mail/mail.service';
import { UpdateSocioDto } from './dto/update-socio.dto';
import { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
    private readonly mail: MailService,
  ) {}

  async createMember(requestingRole: UserRole, dto: CreateMemberDto) {
    if (requestingRole !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può creare soci');

    const fiscalCodeHash = this.enc.hmac(dto.fiscalCode);
    const membershipYear = new Date().getFullYear();

    const duplicate = await this.prisma.member.findFirst({
      where: { fiscalCodeHash, membershipYear, status: { not: 'rifiutato' }, deletedAt: null },
    });
    if (duplicate)
      throw new ConflictException(
        `Esiste già un'iscrizione attiva per questo codice fiscale nell'anno ${membershipYear}`,
      );

    const member = await this.prisma.member.create({
      data: {
        role: 'MEMBER',
        isMinor: dto.isMinor,
        category: dto.category,
        status: dto.status,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fiscalCode: this.enc.encrypt(dto.fiscalCode.toUpperCase()),
        fiscalCodeHash,
        birthDate: new Date(dto.birthDate),
        birthPlace: this.enc.encrypt(dto.birthPlace),
        gender: dto.gender,
        docType: dto.docType,
        docNumber: this.enc.encrypt(dto.docNumber),
        docExpiry: new Date(dto.docExpiry),
        email: dto.email,
        phone: this.enc.encrypt(dto.phone),
        addressStreet: this.enc.encrypt(dto.addressStreet),
        addressZip: this.enc.encrypt(dto.addressZip),
        addressCity: this.enc.encrypt(dto.addressCity),
        addressProvince: this.enc.encrypt(dto.addressProvince),
        membershipYear,
        paymentMethod: dto.paymentMethod,
        privacyBase: dto.privacyBase,
        privacyNewsletter: dto.privacyNewsletter ?? false,
        privacyThirdParties: dto.privacyThirdParties ?? false,
        ...(dto.guardian && {
          guardian: {
            create: {
              firstName: dto.guardian.firstName,
              lastName: dto.guardian.lastName,
              fiscalCode: this.enc.encrypt(dto.guardian.fiscalCode.toUpperCase()),
              fiscalCodeHash: this.enc.hmac(dto.guardian.fiscalCode),
              relation: dto.guardian.relation,
              docType: dto.guardian.docType,
              docNumber: this.enc.encrypt(dto.guardian.docNumber),
              docExpiry: new Date(dto.guardian.docExpiry),
            },
          },
        }),
      },
      include: { guardian: true },
    });

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = member as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

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

    const direttivo = members.filter((m) => m.role !== UserRole.MEMBER);
    const soci = members.filter((m) => m.role === UserRole.MEMBER);

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
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async updateMember(
    requestingRole: UserRole,
    id: string,
    dto: UpdateSocioDto,
  ) {
    if (requestingRole !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può modificare i soci');

    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
    });
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
        this.mail
          .sendApproved({
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            category: updated.category,
            year: updated.membershipYear ?? new Date().getFullYear(),
          })
          .catch(() => {});
      } else if (dto.status === 'rifiutato') {
        this.mail
          .sendRejected({
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            year: updated.membershipYear ?? new Date().getFullYear(),
          })
          .catch(() => {});
      }
    }

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = updated as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async deleteMember(requestingRole: UserRole, id: string) {
    if (requestingRole !== UserRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può eliminare i soci');

    const member = await this.prisma.member.findUnique({
      where: { id, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Socio non trovato');

    await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getDonationStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [all, month] = await Promise.all([
      this.prisma.donation.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.donation.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      count: all._count.id,
      total: Number(all._sum.amount ?? 0),
      thisMonthCount: month._count.id,
      thisMonthTotal: Number(month._sum.amount ?? 0),
    };
  }
}
