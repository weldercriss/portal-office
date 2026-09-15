import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { FormularioPublicoController } from './formulario-publico.controller';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from './solicitacoes.service';

@Module({
  imports: [NotificacoesModule],
  providers: [SolicitacoesService],
  controllers: [SolicitacoesController, FormularioPublicoController],
  exports: [SolicitacoesService],
})
export class SolicitacoesModule {}
