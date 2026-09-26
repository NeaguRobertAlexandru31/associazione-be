import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
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
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  refresh(@Req() req: ExpressRequest) {
    return this.authService.refresh(req.cookies?.['acr_refresh']);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.clearRefreshCookie(res);
    return { ok: true };
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
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteProfile(
    @Request() req: { user: { id: string } },
    @Body('currentPassword') currentPassword: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.authService.clearRefreshCookie(res);
    return this.authService.deleteProfile(req.user.id, currentPassword);
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
    return this.authService.updatePermissions(
      req.user.id,
      targetId,
      dto.pagePermissions,
    );
  }

  // ── Promozione ruolo (solo SUPERADMIN) ────────────────────────────────────

  @UseGuards(AdminGuard)
  @Patch('members/:id/role')
  promoteRole(
    @Request() req: { user: { id: string } },
    @Param('id') targetId: string,
    @Body() dto: PromoteRoleDto,
  ) {
    return this.authService.promoteRole(
      req.user.id,
      targetId,
      dto.role,
      dto.boardRoles ?? [],
    );
  }
}
