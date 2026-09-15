import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTipoSolicitacaoDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsBoolean()
  requerAprovacao?: boolean;

  @IsOptional()
  @IsBoolean()
  contaComoAfastamento?: boolean;

  @IsOptional()
  @IsBoolean()
  ehFolga?: boolean;
}
