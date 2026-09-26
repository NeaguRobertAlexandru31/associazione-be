import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { RsvpService } from './rsvp.service';

@Controller('events/:eventId/rsvp')
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Post()
  create(@Param('eventId') eventId: string, @Body() dto: CreateRsvpDto) {
    return this.rsvpService.create(eventId, dto);
  }

  @Get('stats')
  getStats(@Param('eventId') eventId: string) {
    return this.rsvpService.getStats(eventId);
  }

  @UseGuards(AdminGuard)
  @Get()
  getAll(@Param('eventId') eventId: string) {
    return this.rsvpService.getAll(eventId);
  }
}
