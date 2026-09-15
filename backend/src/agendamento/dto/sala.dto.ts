import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class DisponibilidadeDto {
  /** 0 = domingo, 6 = sábado. */
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana!: number;

  @Matches(HORA, { message: 'horaInicio deve estar no formato HH:MM' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFim deve estar no formato HH:MM' })
  horaFim!: string;

  /** Passo da grade de horários; a reserva em si não fica presa a um bloco. */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  duracaoMinutos?: number;
}

export class CreateSalaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome!: string;

  /** String vazia limpa o campo. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  localizacao?: string;

  /** `null` limpa a capacidade registrada. */
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacidade?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  /** Janelas semanais em que a sala pode ser reservada. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(70)
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadeDto)
  disponibilidades?: DisponibilidadeDto[];
}

export class UpdateSalaDto extends PartialType(CreateSalaDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
