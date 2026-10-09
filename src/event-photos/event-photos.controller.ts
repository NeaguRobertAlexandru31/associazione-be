import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsArray, IsString, IsOptional, IsEmail, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EventPhotosService } from './event-photos.service';

class FileMetaDto {
  @IsString() name: string;
  @IsString() type: string;
}

class PresignRequestDto {
  @IsString() uploaderName: string;
  @IsOptional() @IsEmail() uploaderEmail?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => FileMetaDto) files: FileMetaDto[];
}

class ConfirmUploadDto {
  @IsString() uploaderName: string;
  @IsOptional() @IsEmail() uploaderEmail?: string;
  @IsArray() @IsString({ each: true }) keys: string[];
}

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  /image\/(jpeg|png|webp|heic|heif)/.test(file.mimetype)
    ? cb(null, true)
    : cb(null, false);
};

@Controller('events/:slug/photos')
export class EventPhotosController {
  constructor(private readonly svc: EventPhotosService) {}

  /** Genera token QR — solo admin */
  @Get('upload-token')
  @UseGuards(AdminGuard)
  generateToken(@Param('slug') slug: string, @Query('force') force?: string) {
    return this.svc.generateUploadToken(slug, force === 'true');
  }

  /** Link di upload pubblico — nessuna auth richiesta */
  @Get('share-link')
  getShareLink(@Param('slug') slug: string) {
    return this.svc.generateUploadToken(slug);
  }

  /** Genera presigned URL per upload diretto su S3 (bypass API Gateway 10MB limit) */
  @Post('presign')
  presign(
    @Param('slug') slug: string,
    @Headers('x-upload-token') token: string,
    @Body() dto: PresignRequestDto,
  ) {
    return this.svc.presignUploads(slug, token, dto.files, dto.uploaderName, dto.uploaderEmail);
  }

  /** Conferma upload completato su S3 — salva su DB e applica watermark */
  @Post('confirm')
  confirm(
    @Param('slug') slug: string,
    @Headers('x-upload-token') token: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.svc.confirmUploads(slug, token, dto.keys, dto.uploaderName, dto.uploaderEmail);
  }

  /** Upload pubblico tramite token nel header x-upload-token */
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadPhotos(
    @Param('slug') slug: string,
    @Headers('x-upload-token') token: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('uploaderName') uploaderName: string,
    @Body('uploaderEmail') uploaderEmail: string,
  ) {
    return this.svc.uploadPhotos(slug, token, files, uploaderName, uploaderEmail);
  }

  /** Lista foto — admin vede tutte; pubblico solo approved */
  @Get()
  getPhotos(
    @Param('slug') slug: string,
    @Query('approved') approved?: string,
  ) {
    const approvedOnly = approved === 'true';
    return this.svc.getPhotos(slug, approvedOnly);
  }

  /** Approva foto — solo admin */
  @Patch(':id/approve')
  @UseGuards(AdminGuard)
  approve(@Param('id') id: string) {
    return this.svc.approvePhoto(id);
  }

  /** Elimina foto — solo admin */
  @Delete(':id')
  @UseGuards(AdminGuard)
  delete(@Param('id') id: string) {
    return this.svc.deletePhoto(id);
  }
}
