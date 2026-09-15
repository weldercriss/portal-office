import { PartialType } from '@nestjs/mapped-types';
import { EquipamentoStatus, EstadoEquipamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateEquipamentoDto {
  @IsUUID()
  tipoId!: string;

  /** Número de patrimônio. String vazia limpa o campo (nem todo item tem). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroSerie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelo?: string;

  @IsOptional()
  @IsEnum(EstadoEquipamento)
  estado?: EstadoEquipamento;

  @IsOptional()
  @IsEnum(EquipamentoStatus)
  status?: EquipamentoStatus;

  @IsOptional()
  @IsISO8601()
  dataAquisicao?: string;

  /** `null` limpa o valor registrado. */
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999)
  valorAquisicao?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}

export class UpdateEquipamentoDto extends PartialType(CreateEquipamentoDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
