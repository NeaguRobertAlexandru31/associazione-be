import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSocioDto } from './dto/update-socio.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSocio(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Socio non trovato');
    return member;
  }

  async updateSocio(requestingRole: AdminRole, id: string, dto: UpdateSocioDto) {
    if (requestingRole !== AdminRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può modificare i soci');

    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Socio non trovato');

    const data: Record<string, unknown> = { ...dto };
    if (dto.birthDate) data['birthDate'] = new Date(dto.birthDate);
    if (dto.docExpiry)  data['docExpiry']  = new Date(dto.docExpiry);

    return this.prisma.member.update({ where: { id }, data });
  }

  async deleteSocio(requestingRole: AdminRole, id: string) {
    if (requestingRole !== AdminRole.SUPERADMIN)
      throw new ForbiddenException('Solo il presidente può eliminare i soci');

    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Socio non trovato');

    await this.prisma.member.delete({ where: { id } });
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

  async getAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!admin) throw new NotFoundException('Membro direttivo non trovato');
    return admin;
  }

  async getAll() {
    const [direttivo, soci] = await Promise.all([
      this.prisma.adminUser.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.member.findMany({
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
