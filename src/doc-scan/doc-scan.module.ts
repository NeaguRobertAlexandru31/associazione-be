import { Module } from '@nestjs/common';
import { DocScanController } from './doc-scan.controller';
import { DocScanService } from './doc-scan.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [DocScanController],
  providers: [DocScanService],
})
export class DocScanModule {}
