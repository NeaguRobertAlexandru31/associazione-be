import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { R2Module } from '../r2/r2.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [AuthModule, R2Module],
  controllers: [UploadsController],
})
export class UploadsModule {}
