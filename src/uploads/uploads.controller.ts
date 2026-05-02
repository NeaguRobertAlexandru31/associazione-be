import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const imageFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowed = /image\/(jpeg|png|webp|gif)/;
  allowed.test(file.mimetype) ? cb(null, true) : cb(null, false);
};

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('events')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/events',
        filename: (req, file, cb) => {
          const unique = randomBytes(10).toString('hex');
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = (files ?? []).map(f => `/uploads/events/${f.filename}`);
    return { urls };
  }
}
