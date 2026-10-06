import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { SubmitScanDto } from './dto/submit-scan.dto';

const TOKEN_TTL_HOURS = 48;

@Injectable()
export class DocScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async createToken(dto: CreateTokenDto) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_TTL_HOURS);
    return this.prisma.docScanToken.create({
      data: { label: dto.label, expiresAt },
    });
  }

  async getToken(token: string) {
    const record = await this.prisma.docScanToken.findUnique({ where: { token } });
    if (!record) throw new NotFoundException('Link non valido');
    if (record.expiresAt < new Date()) throw new BadRequestException('Link scaduto');
    return record;
  }

  async presignUpload(token: string, contentType: string) {
    const record = await this.getToken(token);
    if (record.usedAt) throw new BadRequestException('Documento già caricato');
    const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
    const key = `doc-scans/${record.id}-${Date.now()}.${ext}`;
    const url = await this.s3.presignedPut(key, contentType, 300);
    return { uploadUrl: url, key };
  }

  async submit(token: string, dto: SubmitScanDto) {
    const record = await this.getToken(token);
    if (record.usedAt) throw new BadRequestException('Documento già caricato');
    return this.prisma.docScanToken.update({
      where: { token },
      data: {
        usedAt: new Date(),
        submittedBy: dto.name,
        submittedEmail: dto.email,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
      },
    });
  }

  getAll() {
    return this.prisma.docScanToken.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteToken(id: string) {
    const record = await this.prisma.docScanToken.findUnique({ where: { id } });
    if (!record) throw new NotFoundException();
    if (record.fileUrl) await this.s3.delete(record.fileUrl);
    return this.prisma.docScanToken.delete({ where: { id } });
  }
}
