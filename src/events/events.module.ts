import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { R2Module } from '../r2/r2.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [AuthModule, R2Module],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
