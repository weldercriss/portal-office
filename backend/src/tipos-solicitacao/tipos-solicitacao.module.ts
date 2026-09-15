import { Module } from '@nestjs/common';
import { TiposSolicitacaoController } from './tipos-solicitacao.controller';
import { TiposSolicitacaoService } from './tipos-solicitacao.service';

@Module({
  providers: [TiposSolicitacaoService],
  controllers: [TiposSolicitacaoController],
  exports: [TiposSolicitacaoService],
})
export class TiposSolicitacaoModule {}
