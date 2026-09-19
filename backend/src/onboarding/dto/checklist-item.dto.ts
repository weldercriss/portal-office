import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum StatusChecklistItemDto {
  PENDENTE = 'PENDENTE',
  CONCLUIDO = 'CONCLUIDO',
}

export enum TipoChecklistDto {
  ADMISSAO = 'ADMISSAO',
  DESLIGAMENTO = 'DESLIGAMENTO',
}

export class CreateChecklistItemDto {
  @IsString()
  titulo!: string;

  @IsOptional()
  @IsEnum(TipoChecklistDto)
  tipo?: TipoChecklistDto;

  @IsOptional()
  @IsString()
  categoria?: string;
}

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsEnum(StatusChecklistItemDto)
  status?: StatusChecklistItemDto;

  /** Só quem é ADMIN/MASTER consegue de fato gravar isso — ver garantirAcessoEscrita/ADMIN no controller. */
  @IsOptional()
  @IsString()
  observacaoInterna?: string;
}
