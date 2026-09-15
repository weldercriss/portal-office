import { Module } from '@nestjs/common';
import { AgendaGoogleModule } from '../agenda-google/agenda-google.module';
import { ConvitesAgendaController } from './convites-agenda.controller';
import { ConvitesAgendaService } from './convites-agenda.service';

@Module({
  imports: [AgendaGoogleModule],
  controllers: [ConvitesAgendaController],
  providers: [ConvitesAgendaService],
})
export class ConvitesAgendaModule {}
