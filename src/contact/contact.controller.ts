import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.contactService.findAll();
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount() {
    return this.contactService.unreadCount();
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markRead(@Param('id') id: string) {
    return this.contactService.markRead(id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  deleteMany(@Body('ids') ids: string[]) {
    return this.contactService.deleteMany(ids);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  reply(@Param('id') id: string, @Body() dto: ReplyContactDto, @Request() req: any) {
    return this.contactService.reply(id, req.user.name, req.user.email, dto.message);
  }
}
