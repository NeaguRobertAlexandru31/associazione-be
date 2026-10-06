import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationsService } from './registrations.service';

@Controller('api/registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('check-fiscal-code')
  checkFiscalCode(@Query('fiscalCode') fiscalCode: string) {
    return this.registrationsService.checkFiscalCode(fiscalCode);
  }

  @Post()
  create(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.create(dto);
  }
}
