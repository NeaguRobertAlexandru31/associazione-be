import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FinanceService } from './finance.service';

@UseGuards(AdminGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  getSummary() {
    return this.finance.getSummary();
  }
}
