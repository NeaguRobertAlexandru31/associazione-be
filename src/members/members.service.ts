import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSocio(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Socio non trovato');
    return member;
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
