import { Module } from '@nestjs/common';
import { AgendaGoogleModule } from '../agenda-google/agenda-google.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { SolicitacoesModule } from '../solicitacoes/solicitacoes.module';
import { PlantoesController } from './plantoes.controller';
import { PlantoesService } from './plantoes.service';

@Module({
  imports: [NotificacoesModule, SolicitacoesModule, AgendaGoogleModule],
  providers: [PlantoesService],
  controllers: [PlantoesController],
})
export class PlantoesModule {}
