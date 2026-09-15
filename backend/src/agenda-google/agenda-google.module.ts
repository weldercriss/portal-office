import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgendaGoogleOAuthController } from './agenda-google-oauth.controller';
import { AgendaGoogleOAuthService } from './agenda-google-oauth.service';
import { AgendaGoogleController } from './agenda-google.controller';
import { AgendaGoogleCrypto } from './agenda-google.crypto';
import { AgendaGoogleService } from './agenda-google.service';
import { AgendaGoogleWorker } from './agenda-google.worker';
import { GoogleCalendarClient } from './google-calendar.client';

@Module({
  imports: [AuthModule],
  providers: [
    AgendaGoogleCrypto,
    AgendaGoogleOAuthService,
    AgendaGoogleService,
    GoogleCalendarClient,
    AgendaGoogleWorker,
  ],
  controllers: [AgendaGoogleController, AgendaGoogleOAuthController],
  exports: [AgendaGoogleService, GoogleCalendarClient],
})
export class AgendaGoogleModule {}
