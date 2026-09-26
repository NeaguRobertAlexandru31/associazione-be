import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateDocumentDto } from './dto/create-document.dto';

const DOC_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  getAll() {
    return this.prisma.document.findMany({
      select: DOC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: dto,
      select: DOC_SELECT,
    });
  }

  async delete(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento non trovato');
    await this.s3.delete(doc.fileUrl);
    return this.prisma.document.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    const docs = await this.prisma.document.findMany({
      where: { id: { in: ids } },
      select: { fileUrl: true },
    });
    await this.s3.deleteMany(docs.map((d) => d.fileUrl));
    return this.prisma.document.deleteMany({ where: { id: { in: ids } } });
  }
}
