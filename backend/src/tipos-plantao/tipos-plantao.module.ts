import { Module } from '@nestjs/common';
import { TiposPlantaoController } from './tipos-plantao.controller';
import { TiposPlantaoService } from './tipos-plantao.service';

@Module({
  providers: [TiposPlantaoService],
  controllers: [TiposPlantaoController],
  exports: [TiposPlantaoService],
})
export class TiposPlantaoModule {}
