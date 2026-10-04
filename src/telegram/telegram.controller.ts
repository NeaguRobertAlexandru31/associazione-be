import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() update: any): void {
    // Risponde subito 200 a Telegram, poi processa in background.
    // Se si aspetta il completamento, la Lambda può andare in timeout
    // (cold start + download immagine + sharp) e Telegram riprova il webhook.
    this.telegram.handleUpdate(update).catch(() => undefined);
  }
}
