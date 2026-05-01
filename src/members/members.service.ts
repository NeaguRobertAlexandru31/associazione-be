import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const [direttivo, soci] = await Promise.all([
      this.prisma.adminUser.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.member.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          subscription: true,
          profileImage: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { direttivo, soci };
  }
}
