import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { CreateArticleDto } from './dto/create-article.dto';

const ARTICLE_SELECT = {
  id:          true,
  name:        true,
  description: true,
  categories:  true,
  images:      true,
  createdAt:   true,
  updatedAt:   true,
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
        name:        dto.name,
        description: dto.description,
        categories:  dto.categories ?? [],
        images:      dto.images ?? [],
      },
      select: ARTICLE_SELECT,
    });
  }

  async delete(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Articolo non trovato');
    await this.r2.deleteMany(article.images);
    return this.prisma.article.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids } },
      select: { images: true },
    });
    await this.r2.deleteMany(articles.flatMap(a => a.images));
    return this.prisma.article.deleteMany({ where: { id: { in: ids } } });
  }
}
