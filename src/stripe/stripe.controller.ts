import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { IsEmail, IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import type { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeService } from './stripe.service';

class DonationCheckoutDto {
  @IsNumber() @Min(1)
  amount!: number;

  @IsIn(['once', 'monthly'])
  frequency!: 'once' | 'monthly';

  @IsOptional() @IsEmail()
  email?: string;
}

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly webhook: StripeWebhookService,
    private readonly stripe: StripeService,
  ) {}

  @Post('donation-checkout')
  async createDonationCheckout(@Body() dto: DonationCheckoutDto) {
    const url = await this.stripe.createDonationSession(dto);
    return { url };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.webhook.handle(req.body as Buffer, signature);
    return { received: true };
  }
}
