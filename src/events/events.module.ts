import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from '../s3/s3.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [AuthModule, S3Module],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
