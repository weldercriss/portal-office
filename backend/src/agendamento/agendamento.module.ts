import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AgendaGoogleModule } from '../agenda-google/agenda-google.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AgendamentoGateway } from './agendamento.gateway';
import { ReservaLembreteWorker } from './reserva-lembrete.worker';
import { ReservasAgendaService } from './reservas-agenda.service';
import { ReservasAgendaWorker } from './reservas-agenda.worker';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { SalasController } from './salas.controller';
import { SalasService } from './salas.service';

/**
 * Agendamento de salas (API v1). Autocontido de proposito: o plano preve que
 * este modulo possa migrar inteiro para outro projeto, entao ele so consome os
 * primitivos da agenda (cliente do Google e estado da conexao), sem mexer nas
 * tabelas de sincronizacao dos plantoes.
 */
@Module({
  imports: [JwtModule.register({}), NotificacoesModule, AgendaGoogleModule],
  providers: [
    SalasService,
    ReservasService,
    ReservasAgendaService,
    ReservasAgendaWorker,
    AgendamentoGateway,
    ReservaLembreteWorker,
  ],
  controllers: [SalasController, ReservasController],
  exports: [SalasService, ReservasService],
})
export class AgendamentoModule {}
