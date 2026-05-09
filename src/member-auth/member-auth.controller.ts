import { Body, Controller, Delete, Get, Patch, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomBytes } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');
import { CheckEmailDto } from './dto/check-email.dto';
import { MemberLoginDto } from './dto/member-login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateMemberMeDto } from './dto/update-member-me.dto';
import { MemberJwtGuard } from './guards/member-jwt.guard';
import { MemberAuthService } from './member-auth.service';
import { R2Service } from '../r2/r2.service';
import { PrismaService } from '../prisma/prisma.service';

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  /image\/(jpeg|png|webp|gif)/.test(file.mimetype) ? cb(null, true) : cb(null, false);
};

@Controller('member-auth')
export class MemberAuthController {
  constructor(
    private readonly service: MemberAuthService,
    private readonly r2: R2Service,
    private readonly prisma: PrismaService,
  ) {}

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

  @UseGuards(MemberJwtGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage:    memoryStorage(),
      fileFilter: imageFilter,
      limits:     { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    const webpBuffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `avatars/${randomBytes(10).toString('hex')}.webp`;
    const url = await this.r2.upload(key, webpBuffer);

    await this.prisma.member.update({
      where: { id: req.user.id },
      data: { profileImage: url },
    });

    return { url };
  }
}
