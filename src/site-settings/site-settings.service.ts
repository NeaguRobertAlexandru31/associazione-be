import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.siteSetting.upsert({
      where:  { key },
      update: { value },
      create: { key, value },
    });
  }
}
