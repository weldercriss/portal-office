import { Module } from '@nestjs/common';
import { DependentesController } from './dependentes.controller';
import { DependentesService } from './dependentes.service';

@Module({
  providers: [DependentesService],
  controllers: [DependentesController],
})
export class DependentesModule {}
