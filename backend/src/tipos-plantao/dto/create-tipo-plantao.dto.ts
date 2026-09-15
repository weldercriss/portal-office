import { RegraRecorrenciaPlantao } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateTipoPlantaoDto {
  @IsString()
  nome!: string;

  @IsEnum(RegraRecorrenciaPlantao)
  regra!: RegraRecorrenciaPlantao;
}
