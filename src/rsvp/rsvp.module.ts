import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RsvpController } from './rsvp.controller';
import { RsvpService } from './rsvp.service';

@Module({
  imports: [AuthModule],
  controllers: [RsvpController],
  providers: [RsvpService],
})
export class RsvpModule {}
