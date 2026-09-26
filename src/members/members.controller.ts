import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateSocioDto } from './dto/update-socio.dto';
import { MembersService } from './members.service';

@UseGuards(AdminGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  getAll() {
    return this.membersService.getAll();
  }

  @Get('donation-stats')
  getDonationStats() {
    return this.membersService.getDonationStats();
  }

  @Get(':id')
  getMember(@Param('id') id: string) {
    return this.membersService.getMember(id);
  }

  @Patch(':id')
  updateMember(
    @Request() req: { user: { role: UserRole } },
    @Param('id') id: string,
    @Body() dto: UpdateSocioDto,
  ) {
    return this.membersService.updateMember(req.user.role, id, dto);
  }

  @Delete(':id')
  deleteMember(
    @Request() req: { user: { role: UserRole } },
    @Param('id') id: string,
  ) {
    return this.membersService.deleteMember(req.user.role, id);
  }
}
