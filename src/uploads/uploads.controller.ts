import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomBytes } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { R2Service } from '../r2/r2.service';

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  /image\/(jpeg|png|webp|gif)/.test(file.mimetype) ? cb(null, true) : cb(null, false);
};

const memStorage = memoryStorage();

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly r2: R2Service) {}

  private async processAndUpload(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    return Promise.all(
      (files ?? []).map(async file => {
        const webpBuffer = await sharp(file.buffer)
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const key = `${folder}/${randomBytes(10).toString('hex')}.webp`;
        return this.r2.upload(key, webpBuffer);
      }),
    );
  }

  @Post('events')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage:    memStorage,
      fileFilter: imageFilter,
      limits:     { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadEvents(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'events');
    return { urls };
  }

  @Post('articles')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage:    memStorage,
      fileFilter: imageFilter,
      limits:     { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadArticles(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'articles');
    return { urls };
  }

  @Post('projects')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage:    memStorage,
      fileFilter: imageFilter,
      limits:     { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadProjects(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'projects');
    return { urls };
  }

  @Post('settings')
  @UseInterceptors(
    FilesInterceptor('files', 1, {
      storage:    memStorage,
      fileFilter: imageFilter,
      limits:     { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadSettings(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.processAndUpload(files, 'settings');
    return { urls };
  }
}
