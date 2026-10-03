import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { WatermarkModule } from '../watermark/watermark.module';
import { EventPhotosController } from './event-photos.controller';
import { EventPhotosService } from './event-photos.service';

@Module({
  imports: [AuthModule, PrismaModule, S3Module, WatermarkModule, MailModule],
  controllers: [EventPhotosController],
  providers: [EventPhotosService],
})
export class EventPhotosModule {}
