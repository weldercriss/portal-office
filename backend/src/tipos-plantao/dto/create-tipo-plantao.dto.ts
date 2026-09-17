import { RegraRecorrenciaPlantao } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
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

  /** 0=Dom..6=Sáb. Obrigatório quando a regra é SEMANAL. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];
}
