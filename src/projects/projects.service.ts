import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

const PROJECT_SELECT = {
  id:          true,
  title:       true,
  description: true,
  category:    true,
  status:      true,
  images:      true,
  createdAt:   true,
  updatedAt:   true,
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.project.findMany({
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: PROJECT_SELECT });
    if (!project) throw new NotFoundException('Progetto non trovato');
    return project;
  }

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        title:       dto.title,
        description: dto.description,
        category:    dto.category,
        status:      dto.status,
        images:      dto.images ?? [],
      },
      select: PROJECT_SELECT,
    });
  }

  async update(id: string, dto: Partial<CreateProjectDto>) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Progetto non trovato');
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.title       !== undefined && { title:       dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category    !== undefined && { category:    dto.category }),
        ...(dto.status      !== undefined && { status:      dto.status }),
        ...(dto.images      !== undefined && { images:      dto.images }),
      },
      select: PROJECT_SELECT,
    });
  }

  async delete(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Progetto non trovato');
    return this.prisma.project.delete({ where: { id } });
  }

  deleteMany(ids: string[]) {
    return this.prisma.project.deleteMany({ where: { id: { in: ids } } });
  }
}
