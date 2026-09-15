import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from './solicitacoes.service';

@Module({
  imports: [NotificacoesModule],
  providers: [SolicitacoesService],
  controllers: [SolicitacoesController],
  exports: [SolicitacoesService],
})
export class SolicitacoesModule {}
