import { Module } from '@nestjs/common';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';

@Module({
  providers: [TurnosService],
  controllers: [TurnosController],
  exports: [TurnosService],
})
export class TurnosModule {}
