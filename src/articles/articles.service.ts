import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { CreateArticleDto } from './dto/create-article.dto';

const ARTICLE_SELECT = {
  id:         true,
  name:       true,
  categories: true,
  blocks:     true,
  cover:      true,
  createdAt:  true,
  updatedAt:  true,
} as const;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2:     R2Service,
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

  create(dto: CreateArticleDto) {
    return this.prisma.article.create({
      data: {
        name:       dto.name,
        categories: dto.categories ?? [],
        blocks:     dto.blocks as unknown as Prisma.InputJsonValue,
        cover:      dto.cover,
      },
      select: ARTICLE_SELECT,
    });
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
    const images = articles.flatMap(a => this.extractImages(a.blocks, a.cover));
    await this.r2.deleteMany(images);
    return this.prisma.article.deleteMany({ where: { id: { in: ids } } });
  }

  private extractImages(blocks: Prisma.JsonValue, cover: string | null): string[] {
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
