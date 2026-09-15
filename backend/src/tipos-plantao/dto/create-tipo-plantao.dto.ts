import { RegraRecorrenciaPlantao } from '@prisma/client';
import { IsEnum, IsString, Matches } from 'class-validator';
import { HORA_REGEX } from '../../common/validation/hora';

export class CreateTipoPlantaoDto {
  @IsString()
  nome!: string;

  @Matches(HORA_REGEX, { message: 'horaInicio deve estar no formato HH:mm' })
  horaInicio!: string;

  @Matches(HORA_REGEX, { message: 'horaFim deve estar no formato HH:mm' })
  horaFim!: string;

  @IsEnum(RegraRecorrenciaPlantao)
  regra!: RegraRecorrenciaPlantao;
}
