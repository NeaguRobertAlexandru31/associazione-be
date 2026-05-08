import { Body, Controller, Delete, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSocioDto } from './dto/update-socio.dto';
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

  @Patch('soci/:id')
  updateSocio(
    @Request() req: { user: { id: string; role: AdminRole } },
    @Param('id') id: string,
    @Body() dto: UpdateSocioDto,
  ) {
    return this.membersService.updateSocio(req.user.role, id, dto);
  }

  @Delete('soci/:id')
  deleteSocio(
    @Request() req: { user: { id: string; role: AdminRole } },
    @Param('id') id: string,
  ) {
    return this.membersService.deleteSocio(req.user.role, id);
  }

  @Get('admin/:id')
  getAdmin(@Param('id') id: string) {
    return this.membersService.getAdmin(id);
  }

  @Patch('admin/:id/board-role')
  updateAdminBoardRoles(
    @Request() req: { user: { id: string; role: AdminRole } },
    @Param('id') id: string,
    @Body('boardRoles') boardRoles: string[],
  ) {
    return this.membersService.updateAdminBoardRoles(req.user.role, id, boardRoles ?? []);
  }

  @Delete('admin/:id')
  deleteAdmin(
    @Request() req: { user: { id: string; role: AdminRole } },
    @Param('id') id: string,
  ) {
    return this.membersService.deleteAdmin(req.user.role, req.user.id, id);
  }
}
