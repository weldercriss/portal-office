import { Module } from '@nestjs/common';
import { SubAreasController } from './subareas.controller';
import { SubAreasService } from './subareas.service';

@Module({
  providers: [SubAreasService],
  controllers: [SubAreasController],
  exports: [SubAreasService],
})
export class SubAreasModule {}
