import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EncryptionModule } from './encryption/encryption.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { ActivityModule } from './activity/activity.module';
import { EventsModule } from './events/events.module';
import { UploadsModule } from './uploads/uploads.module';
import { ContactModule } from './contact/contact.module';
import { ArticlesModule } from './articles/articles.module';
import { ProjectsModule } from './projects/projects.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { StripeModule } from './stripe/stripe.module';
import { FinanceModule } from './finance/finance.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    EncryptionModule,
    AuthModule,
    MembersModule,
    RegistrationsModule,
    ActivityModule,
    EventsModule,
    UploadsModule,
    ContactModule,
    ArticlesModule,
    ProjectsModule,
    SiteSettingsModule,
    StripeModule,
    FinanceModule,
    RsvpModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
