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
