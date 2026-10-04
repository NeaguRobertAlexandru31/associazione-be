import { Body, Controller, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Post('webhook')
  async webhook(@Body() update: any): Promise<void> {
    await this.telegram.handleUpdate(update);
  }
}
