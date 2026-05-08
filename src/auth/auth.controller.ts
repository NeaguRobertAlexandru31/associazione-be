import { Body, Controller, Delete, Get, Patch, Post, Req, Res, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterWithTokenDto } from './dto/register-with-token.dto';
import { UpdateMyMemberDto } from './dto/update-my-member.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('register')
  register(@Body() dto: RegisterWithTokenDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.registerWithToken(dto, res);
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

  @Post('check-member')
  checkMember(@Body('email') email: string) {
    return this.authService.checkMember(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite')
  createInvite(@Request() req: { user: { id: string; role: any } }) {
    return this.authService.createInvite(req.user.id, req.user.role);
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

  // ── Area personale socio ────────────────────────────────────────────────

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

  @UseGuards(JwtAuthGuard)
  @Delete('me/member')
  deleteMyMember(@Request() req: { user: { id: string } }) {
    return this.authService.deleteMyMember(req.user.id);
  }
}
