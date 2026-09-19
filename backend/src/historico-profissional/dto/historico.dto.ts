import { IsBoolean, IsDateString, IsOptional, IsString, ValidateIf } from 'class-validator';

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

  /** null limpa a data final (marca o cargo como atual); string define a data. */
  @IsOptional()
  @ValidateIf((o: UpdateHistoricoDto) => o.dataFim !== null)
  @IsDateString()
  dataFim?: string | null;

  @IsOptional()
  @IsString()
  observacao?: string;
}
