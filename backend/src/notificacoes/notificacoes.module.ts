import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesGateway } from './notificacoes.gateway';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [JwtModule.register({}), TelegramModule],
  providers: [NotificacoesService, NotificacoesGateway],
  controllers: [NotificacoesController],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
