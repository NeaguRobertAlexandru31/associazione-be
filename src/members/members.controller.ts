import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembersService } from './members.service';

@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  getAll() {
    return this.membersService.getAll();
  }

  @Get('soci/:id')
  getSocio(@Param('id') id: string) {
    return this.membersService.getSocio(id);
  }

  @Get('admin/:id')
  getAdmin(@Param('id') id: string) {
    return this.membersService.getAdmin(id);
  }
}
