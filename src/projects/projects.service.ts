import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { CreateProjectDto } from './dto/create-project.dto';

const PROJECT_SELECT = {
  id:          true,
  title:       true,
  description: true,
  category:    true,
  status:      true,
  images:      true,
  cover:       true,
  createdAt:   true,
  updatedAt:   true,
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2:     R2Service,
  ) {}

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
        cover:       dto.cover,
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
        ...(dto.cover       !== undefined && { cover:       dto.cover }),
      },
      select: PROJECT_SELECT,
    });
  }

  async delete(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Progetto non trovato');
    const toDelete = [...project.images];
    if (project.cover) toDelete.push(project.cover);
    await this.r2.deleteMany(toDelete);
    return this.prisma.project.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    const projects = await this.prisma.project.findMany({
      where: { id: { in: ids } },
      select: { images: true, cover: true },
    });
    await this.r2.deleteMany(projects.flatMap(p => [...p.images, ...(p.cover ? [p.cover] : [])]));
    return this.prisma.project.deleteMany({ where: { id: { in: ids } } });
  }
}
