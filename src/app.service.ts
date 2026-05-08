import { Injectable } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getPublicStats() {
    const [soci, projects, events, articles] = await Promise.all([
      this.prisma.member.count({ where: { status: { not: MemberStatus.rifiutato } } }),
      this.prisma.project.count(),
      this.prisma.event.count({ where: { date: { gte: new Date() } } }),
      this.prisma.article.count(),
    ]);
    return { soci, projects, events, articles };
  }
}
