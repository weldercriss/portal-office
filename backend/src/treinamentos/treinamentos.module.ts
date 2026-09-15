import { Module } from '@nestjs/common';
import { TreinamentosController } from './treinamentos.controller';
import { TreinamentosService } from './treinamentos.service';

@Module({
  providers: [TreinamentosService],
  controllers: [TreinamentosController],
})
export class TreinamentosModule {}
