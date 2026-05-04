import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { R2Module } from '../r2/r2.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule, AuthModule, R2Module],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
