import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  imports: [MailModule, PrismaModule],
  controllers: [StripeController],
  providers: [StripeService, StripeWebhookService],
  exports: [StripeService],
})
export class StripeModule {}
