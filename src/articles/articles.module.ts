import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { R2Module } from '../r2/r2.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [PrismaModule, AuthModule, R2Module],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
