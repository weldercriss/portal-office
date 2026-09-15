import { Module } from '@nestjs/common';
import { HistoricoController } from './historico.controller';
import { HistoricoService } from './historico.service';

@Module({
  providers: [HistoricoService],
  controllers: [HistoricoController],
})
export class HistoricoModule {}
