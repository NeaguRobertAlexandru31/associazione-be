import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateArticleDto } from './dto/create-article.dto';

const ARTICLE_SELECT = {
  id: true,
  name: true,
  categories: true,
  blocks: true,
  cover: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: S3Service,
    private readonly telegram: TelegramService,
  ) {}

  getAll() {
    return this.prisma.article.findMany({
      select: ARTICLE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: ARTICLE_SELECT,
    });
    if (!article) throw new NotFoundException('Articolo non trovato');
    return article;
  }

  async create(dto: CreateArticleDto) {
    const article = await this.prisma.article.create({
      data: {
        name: dto.name,
        categories: dto.categories ?? [],
        blocks: dto.blocks as unknown as Prisma.InputJsonValue,
        cover: dto.cover,
      },
      select: ARTICLE_SELECT,
    });

    const appUrl = process.env.APP_PUBLIC_URL ?? 'https://acr-milano.it';
    this.telegram.notify({
      title: '📰 Nuovo articolo!',
      cover: article.cover,
      link: `${appUrl}/news/${article.id}`,
      lines: [
        `*${article.name}*`,
        ...(article.categories.length ? [`🏷 ${article.categories.join(', ')}`] : []),
      ],
    }).catch(err => this.logger.error('Telegram notify failed', err));

    return article;
  }

  async delete(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Articolo non trovato');
    const images = this.extractImages(article.blocks, article.cover);
    await this.r2.deleteMany(images);
    return this.prisma.article.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids } },
      select: { blocks: true, cover: true },
    });
    const images = articles.flatMap((a) =>
      this.extractImages(a.blocks, a.cover),
    );
    await this.r2.deleteMany(images);
    return this.prisma.article.deleteMany({ where: { id: { in: ids } } });
  }

  private extractImages(
    blocks: Prisma.JsonValue,
    cover: string | null,
  ): string[] {
    const urls: string[] = [];
    if (cover) urls.push(cover);
    if (Array.isArray(blocks)) {
      for (const b of blocks as any[]) {
        if (b?.image) urls.push(b.image as string);
      }
    }
    return urls;
  }
}
