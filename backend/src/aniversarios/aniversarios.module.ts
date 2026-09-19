import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AniversariosService } from './aniversarios.service';
import { ConfigAvisoAniversarioController } from './config-aviso-aniversario.controller';

@Module({
  imports: [NotificacoesModule],
  providers: [AniversariosService],
  controllers: [ConfigAvisoAniversarioController],
})
export class AniversariosModule {}
