import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHistoricoDto {
  @IsString()
  cargo!: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  /** Preenchido só quando externo=true. */
  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsBoolean()
  externo?: boolean;

  @IsDateString()
  dataInicio!: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class UpdateHistoricoDto {
  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  empresa?: string;

  @IsOptional()
  @IsBoolean()
  externo?: boolean;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
