import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDocumentoDto {
  @IsString()
  nome!: string;

  @IsString()
  categoriaId!: string;

  @IsOptional()
  @IsDateString()
  validade?: string;

  /** Mês/ano de competência (ex.: contracheque) — dia é ignorado, sempre gravado como dia 1. */
  @IsOptional()
  @IsDateString()
  competencia?: string;
}
