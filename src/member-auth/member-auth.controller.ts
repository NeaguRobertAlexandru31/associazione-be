import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CheckEmailDto } from './dto/check-email.dto';
import { MemberLoginDto } from './dto/member-login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateMemberMeDto } from './dto/update-member-me.dto';
import { MemberJwtGuard } from './guards/member-jwt.guard';
import { MemberAuthService } from './member-auth.service';

@Controller('member-auth')
export class MemberAuthController {
  constructor(private readonly service: MemberAuthService) {}

  @Post('check-email')
  checkEmail(@Body() dto: CheckEmailDto) {
    return this.service.checkEmail(dto.email);
  }

  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto) {
    return this.service.setPassword(dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: MemberLoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  @UseGuards(MemberJwtGuard)
  @Get('me')
  getMe(@Request() req: { user: { id: string } }) {
    return this.service.getMe(req.user.id);
  }

  @UseGuards(MemberJwtGuard)
  @Patch('me')
  updateMe(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateMemberMeDto,
  ) {
    return this.service.updateMe(req.user.id, dto);
  }

  @UseGuards(MemberJwtGuard)
  @Delete('me')
  deleteMe(@Request() req: { user: { id: string } }) {
    return this.service.deleteMe(req.user.id);
  }
}
