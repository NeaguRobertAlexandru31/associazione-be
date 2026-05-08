import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MemberJwtGuard } from './guards/member-jwt.guard';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [MemberAuthController],
  providers: [MemberAuthService, MemberJwtGuard],
})
export class MemberAuthModule {}
