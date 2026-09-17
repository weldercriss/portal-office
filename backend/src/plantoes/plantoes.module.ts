import { Module } from '@nestjs/common';
import { AgendaGoogleModule } from '../agenda-google/agenda-google.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { SolicitacoesModule } from '../solicitacoes/solicitacoes.module';
import { PlantoesRecorrenciaWorker } from './plantoes-recorrencia.worker';
import { PlantoesController } from './plantoes.controller';
import { PlantoesService } from './plantoes.service';

@Module({
  imports: [NotificacoesModule, SolicitacoesModule, AgendaGoogleModule],
  providers: [PlantoesService, PlantoesRecorrenciaWorker],
  controllers: [PlantoesController],
})
export class PlantoesModule {}
