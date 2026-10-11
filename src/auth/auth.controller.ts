import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateMyMemberDto } from './dto/update-my-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { SuperadminGuard } from './guards/superadmin.guard';
import { IsBoolean, IsObject } from 'class-validator';

class UpdatePermissionsDto {
  @IsObject()
  pagePermissions: Record<string, boolean>;
}

class PromoteRoleDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boardRoles?: string[];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Body('access_token') accessToken: string) {
    return this.authService.logout(accessToken);
  }

  @Post('check-email')
  checkEmail(@Body('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Post('set-password')
  setPassword(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.setPassword(email, password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Request() req: { user: { id: string }; headers: { authorization?: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.updateProfile(req.user.id, dto, accessToken);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteProfile(
    @Request() req: { user: { id: string }; headers: { authorization?: string } },
  ) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.deleteProfile(req.user.id, accessToken);
  }

  // ── Verifica tessera pubblica ─────────────────────────────────────────────

  @Get('verify/:id')
  verifyMember(@Param('id') id: string) {
    return this.authService.verifyMember(id);
  }

  // ── Profilo anagrafico ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me/tessera')
  getMyTessera(@Request() req: { user: { id: string } }) {
    return this.authService.getMyTessera(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/member')
  getMyMember(@Request() req: { user: { id: string } }) {
    return this.authService.getMyMember(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/member')
  updateMyMember(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateMyMemberDto,
  ) {
    return this.authService.updateMyMember(req.user.id, dto);
  }

  // ── Permessi pagine (solo SUPERADMIN) ────────────────────────────────────

  @UseGuards(SuperadminGuard)
  @Patch('members/:id/permissions')
  updatePermissions(
    @Request() req: { user: { id: string } },
    @Param('id') targetId: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.authService.updatePermissions(req.user.id, targetId, dto.pagePermissions);
  }

  // ── Promozione ruolo (solo ADMIN/SUPERADMIN) ──────────────────────────────

  @UseGuards(AdminGuard)
  @Patch('members/:id/role')
  promoteRole(
    @Request() req: { user: { id: string } },
    @Param('id') targetId: string,
    @Body() dto: PromoteRoleDto,
  ) {
    return this.authService.promoteRole(req.user.id, targetId, dto.role, dto.boardRoles ?? []);
  }
}
