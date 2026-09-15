import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHistoricoDto {
  @IsString()
  cargo!: string;

  @IsOptional()
  @IsString()
  departamento?: string;

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
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
