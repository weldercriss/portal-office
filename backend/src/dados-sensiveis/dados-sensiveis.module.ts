import { Module } from '@nestjs/common';
import { DadosSensiveisController } from './dados-sensiveis.controller';
import { DadosSensiveisService } from './dados-sensiveis.service';

@Module({
  providers: [DadosSensiveisService],
  controllers: [DadosSensiveisController],
})
export class DadosSensiveisModule {}
