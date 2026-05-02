import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { ActivityModule } from './activity/activity.module';
import { EventsModule } from './events/events.module';
import { UploadsModule } from './uploads/uploads.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [PrismaModule, AuthModule, MembersModule, RegistrationsModule, ActivityModule, EventsModule, UploadsModule, ContactModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
