import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() update: any): Promise<void> {
    // In Lambda la risposta HTTP chiude il processo: await garantisce che
    // handleUpdate completi prima che la Lambda risponda 200 a Telegram.
    await this.telegram.handleUpdate(update).catch(() => undefined);
  }
}
