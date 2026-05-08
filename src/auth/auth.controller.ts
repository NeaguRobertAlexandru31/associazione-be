import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterWithTokenDto } from './dto/register-with-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('check-member')
  checkMember(@Body('email') email: string) {
    return this.authService.checkMember(email);
  }

  @Post('register')
  register(@Body() dto: RegisterWithTokenDto) {
    return this.authService.registerWithToken(dto);
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
  ) {
    return this.authService.deleteProfile(req.user.id, currentPassword);
  }
}
