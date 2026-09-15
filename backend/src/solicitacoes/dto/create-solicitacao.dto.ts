import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSolicitacaoDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  responsavelId?: string | null;

  @IsString()
  tipoId!: string;

  @IsDateString()
  dataInicio!: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsObject()
  respostasFormulario?: Record<string, string | string[]>;
}
