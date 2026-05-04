import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SiteSettingsService } from './site-settings.service';

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly svc: SiteSettingsService) {}

  @Get()
  getAll() {
    return this.svc.getAll();
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard)
  set(@Param('key') key: string, @Body('value') value: string) {
    return this.svc.set(key, value);
  }
}
