import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTipoPlantaoDto } from './create-tipo-plantao.dto';

export class UpdateTipoPlantaoDto extends PartialType(CreateTipoPlantaoDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
