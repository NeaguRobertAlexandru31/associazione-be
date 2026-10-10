import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BookingsService } from './bookings.service';

@Controller()
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Get('events/:slug/availability')
  getAvailability(@Param('slug') slug: string) {
    return this.svc.getAvailability(slug);
  }

  @Post('events/:slug/book')
  book(
    @Param('slug') slug: string,
    @Body() dto: { name: string; email: string; phone?: string; seats: number; guests?: { name: string; email?: string; phone?: string }[] },
  ) {
    return this.svc.book(slug, dto);
  }

  @Delete('bookings/cancel/:cancelToken')
  cancel(@Param('cancelToken') cancelToken: string) {
    return this.svc.cancel(cancelToken);
  }

  @Get('bookings/verify/:bookingId')
  @UseGuards(AdminGuard)
  verify(@Param('bookingId') bookingId: string) {
    return this.svc.verify(bookingId);
  }

  @Get('events/:slug/bookings')
  @UseGuards(AdminGuard)
  getBookings(@Param('slug') slug: string) {
    return this.svc.getBookings(slug);
  }
}
