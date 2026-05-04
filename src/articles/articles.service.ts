import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.article.delete({ where: { id } });
  }

  deleteMany(ids: string[]) {
    return this.prisma.article.deleteMany({ where: { id: { in: ids } } });
  }
}
