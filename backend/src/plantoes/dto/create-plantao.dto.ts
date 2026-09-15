import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum PlantaoStatusDto {
  RASCUNHO = 'RASCUNHO',
  PUBLICADO = 'PUBLICADO',
}

export class CreatePlantaoDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsDateString()
  data!: string;

  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsEnum(PlantaoStatusDto)
  status?: PlantaoStatusDto;

  @IsString()
  turnoId!: string;

  @IsString()
  tipoPlantaoId!: string;

  /** Obrigatório quando o tipo de plantão selecionado tem regra diferente de UNICO. */
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  /** 0=Dom..6=Sáb (Date.getUTCDay()). Obrigatório quando a regra é SEMANAL. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];
}
