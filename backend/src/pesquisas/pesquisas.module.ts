import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PesquisasController } from './pesquisas.controller';
import { PesquisasService } from './pesquisas.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [PesquisasController],
  providers: [PesquisasService],
})
export class PesquisasModule {}
