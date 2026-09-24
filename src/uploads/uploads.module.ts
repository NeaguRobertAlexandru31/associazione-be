import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from '../s3/s3.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [AuthModule, S3Module],
  controllers: [UploadsController],
})
export class UploadsModule {}
