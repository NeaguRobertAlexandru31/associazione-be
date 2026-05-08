import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { UpdateSocioDto } from './dto/update-socio.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  async getSocio(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { guardian: true },
    });
    if (!member || member.deletedAt) throw new NotFoundException('Socio non trovato');

    const { passwordHash: _, fiscalCodeHash: __, ...rest } = member as any;
    const decrypted = this.enc.decryptMember(rest);
    if (decrypted.guardian) {
      const { fiscalCodeHash: _gh, ...gRest } = decrypted.guardian as any;
      decrypted.guardian = this.enc.decryptGuardian(gRest);
    }
    return decrypted;
  }

  async updateSocio(requestingRole: AdminRole, id: string, dto: UpdateSocioDto) {
    if (requestingRole !== AdminRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può modificare i soci');

    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member || member.deletedAt) throw new NotFoundException('Socio non trovato');

    const raw: Record<string, unknown> = { ...dto };
    if (dto.birthDate) raw.birthDate = new Date(dto.birthDate);
    if (dto.docExpiry)  raw.docExpiry  = new Date(dto.docExpiry);

    const data = this.enc.encryptMember(raw);

    const updated = await this.prisma.member.update({ where: { id }, data });
    const { passwordHash: _, fiscalCodeHash: __, ...rest } = updated as any;
    return this.enc.decryptMember(rest);
  }

  async deleteSocio(requestingRole: AdminRole, id: string) {
    if (requestingRole !== AdminRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può eliminare i soci');

    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member || member.deletedAt) throw new NotFoundException('Socio non trovato');

    await this.prisma.member.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async deleteAdmin(requestingRole: AdminRole, requestingId: string, targetId: string) {
    if (requestingRole !== AdminRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può rimuovere i membri del direttivo');
    if (requestingId === targetId)
      throw new BadRequestException('Non puoi eliminare il tuo stesso account da qui');

    const target = await this.prisma.adminUser.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Membro del direttivo non trovato');

    if (target.role === AdminRole.SUPERADMIN) {
      const count = await this.prisma.adminUser.count({ where: { role: AdminRole.SUPERADMIN } });
      if (count <= 1) throw new ForbiddenException('Non puoi eliminare l\'unico Presidente');
    }

    await this.prisma.adminUser.delete({ where: { id: targetId } });
  }

  async updateAdminBoardRoles(requestingRole: AdminRole, targetId: string, boardRoles: string[]) {
    if (requestingRole !== AdminRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può assegnare ruoli del direttivo');

    const target = await this.prisma.adminUser.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Membro del direttivo non trovato');

    return this.prisma.adminUser.update({
      where: { id: targetId },
      data: { boardRoles },
      select: { id: true, name: true, email: true, role: true, boardRoles: true, createdAt: true },
    });
  }

  async getAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, boardRoles: true, createdAt: true },
    });
    if (!admin) throw new NotFoundException('Membro direttivo non trovato');
    return admin;
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
      count:           all._count.id,
      total:           Number(all._sum.amount ?? 0),
      thisMonthCount:  month._count.id,
      thisMonthTotal:  Number(month._sum.amount ?? 0),
    };
  }

  async getAll() {
    const [direttivo, soci] = await Promise.all([
      this.prisma.adminUser.findMany({
        select: { id: true, name: true, email: true, role: true, boardRoles: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.member.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          category: true,
          status: true,
          membershipYear: true,
          createdAt: true,
        },
        orderBy: { lastName: 'asc' },
      }),
    ]);

    return { direttivo, soci };
  }
}
