import { Controller, Get } from '@nestjs/common';
import { networkInterfaces } from 'os';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('stats')
  getPublicStats() {
    return this.appService.getPublicStats();
  }

  @Get('dev-info')
  getDevInfo() {
    const iface = Object.values(networkInterfaces())
      .flat()
      .find(x => x?.family === 'IPv4' && !x.internal);
    return { lanIp: iface?.address ?? null };
  }
}
