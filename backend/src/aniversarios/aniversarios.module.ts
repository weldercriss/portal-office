import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AniversariosService } from './aniversarios.service';

@Module({
  imports: [NotificacoesModule],
  providers: [AniversariosService],
})
export class AniversariosModule {}
