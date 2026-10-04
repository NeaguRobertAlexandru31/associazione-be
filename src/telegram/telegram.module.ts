import { Global, Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  imports: [BookingsModule, PrismaModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
