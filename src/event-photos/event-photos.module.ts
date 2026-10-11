import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { WatermarkModule } from '../watermark/watermark.module';
import { EventPhotosController } from './event-photos.controller';
import { EventPhotosService } from './event-photos.service';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.UPLOAD_TOKEN_SECRET ?? process.env.ENCRYPTION_KEY }),
    PrismaModule,
    S3Module,
    WatermarkModule,
    MailModule,
  ],
  controllers: [EventPhotosController],
  providers: [EventPhotosService],
  exports: [EventPhotosService],
})
export class EventPhotosModule {}
