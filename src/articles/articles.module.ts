import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [PrismaModule, AuthModule, S3Module],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
