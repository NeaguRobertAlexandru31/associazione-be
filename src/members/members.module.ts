import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSetupController, MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [AuthModule],
  controllers: [MembersController, AdminSetupController],
  providers: [MembersService],
})
export class MembersModule {}
