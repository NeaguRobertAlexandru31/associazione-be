import {
  Body,
  Controller,
  Logger,
  Post,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomBytes } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { S3Service } from '../s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { WatermarkService } from '../watermark/watermark.service';

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  /image\/(jpeg|png|webp|gif)/.test(file.mimetype)
    ? cb(null, true)
    : cb(null, false);
};

const memStorage = memoryStorage();

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly r2: S3Service,
    private readonly prisma: PrismaService,
    private readonly watermark: WatermarkService,
  ) {}

  private async processAndUpload(
    files: Express.Multer.File[],
    folder: string,
    applyWatermark = false,
  ): Promise<string[]> {
    return Promise.all(
      (files ?? []).map(async (file) => {
        let buf = await sharp(file.buffer)
          .rotate()
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        if (applyWatermark) buf = await this.watermark.apply(buf);

        const key = `${folder}/${randomBytes(10).toString('hex')}.webp`;
        return this.r2.upload(key, buf);
      }),
    );
  }

  @Post('events')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadEvents(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'events', true);
    return { urls };
  }

  @Post('articles')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadArticles(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'articles');
    return { urls };
  }

  @Post('projects')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadProjects(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'projects');
    return { urls };
  }

  @Post('settings')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FilesInterceptor('files', 1, {
      storage: memStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadSettings(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'settings');
    return { urls };
  }

  @Post('placeholders')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FilesInterceptor('files', 1, {
      storage: memStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadPlaceholders(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'placeholders');
    return { urls };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memStorage,
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    const webpBuffer = await sharp(file.buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `avatars/${randomBytes(10).toString('hex')}.webp`;
    const url = await this.r2.upload(key, webpBuffer);

    await this.prisma.member.update({
      where: { id: req.user.id },
      data: { profileImage: url },
    });

    return { url };
  }

  @Post('documents')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memStorage,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `documents/${randomBytes(10).toString('hex')}.${ext}`;
    const url = await this.r2.upload(key, file.buffer, file.mimetype);
    return { url, fileName: file.originalname, fileSize: file.size };
  }

  /** Genera presigned URL per upload diretto su S3 (bypass 10MB API Gateway limit) */
  @Post('presign')
  @UseGuards(AdminGuard)
  async presign(
    @Body() body: { files: { name: string; type: string }[]; folder: string },
  ) {
    const allowed = ['events', 'articles', 'projects', 'settings', 'placeholders'];
    const folder = allowed.includes(body.folder) ? body.folder : 'events';
    const presignedUrls = await Promise.all(
      (body.files ?? []).slice(0, 10).map(async (f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const contentType = f.type || 'image/jpeg';
        const key = `${folder}-raw/${randomBytes(10).toString('hex')}.${ext}`;
        const uploadUrl = await this.r2.presignedPut(key, contentType, 600);
        return { uploadUrl, key };
      }),
    );
    return { presignedUrls };
  }

  /** Processa file raw già caricati su S3: resize + webp + watermark → percorso definitivo */
  @Post('process')
  @UseGuards(AdminGuard)
  async process(
    @Body() body: { keys: string[]; folder: string; watermark?: boolean },
  ) {
    const allowed = ['events', 'articles', 'projects', 'settings', 'placeholders'];
    const folder = allowed.includes(body.folder) ? body.folder : 'events';
    const applyWatermark = body.watermark ?? false;

    const urls = await Promise.all(
      (body.keys ?? []).map(async (key) => {
        const rawBuf = await this.r2.download(key);
        let buf = await sharp(rawBuf)
          .rotate()
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        if (applyWatermark) buf = await this.watermark.apply(buf);
        const finalKey = `${folder}/${randomBytes(10).toString('hex')}.webp`;
        const url = await this.r2.upload(finalKey, buf);
        await this.r2.delete(key).catch(() => {});
        return url;
      }),
    );
    return { urls };
  }

  @Post('rewatermark')
  @UseGuards(AdminGuard)
  async rewatermarkAll() {
    const [events, photos] = await Promise.all([
      this.prisma.event.findMany({ select: { id: true, images: true, cover: true } }),
      this.prisma.eventPhoto.findMany({ select: { id: true, url: true } }),
    ]);

    let processed = 0;
    let failed = 0;

    const processUrl = async (url: string): Promise<string> => {
      const buf = await this.r2.download(url);
      const watermarked = await this.watermark.apply(buf);
      return this.r2.upload(
        url.replace(/^https?:\/\/[^/]+\//, ''),
        watermarked,
      );
    };

    // Foto ufficiali eventi
    for (const ev of events) {
      const urls = [...ev.images, ...(ev.cover ? [ev.cover] : [])];
      for (const url of urls) {
        try {
          await processUrl(url);
          processed++;
        } catch (e) {
          this.logger.error(`Failed rewatermark ${url}: ${e}`);
          failed++;
        }
      }
    }

    // Foto partecipanti
    for (const photo of photos) {
      try {
        await processUrl(photo.url);
        processed++;
      } catch (e) {
        this.logger.error(`Failed rewatermark photo ${photo.id}: ${e}`);
        failed++;
      }
    }

    return { processed, failed };
  }
}
