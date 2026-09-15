import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export enum EtapaCandidatoDto {
  TRIAGEM = 'TRIAGEM',
  ENTREVISTA = 'ENTREVISTA',
  AVALIACAO = 'AVALIACAO',
  APROVADO = 'APROVADO',
  REPROVADO = 'REPROVADO',
}

export class CreateVagaDto {
  @IsString()
  titulo!: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}

export class UpdateVagaDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  aberta?: boolean;
}

export class CreateCandidatoDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateCandidatoDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEnum(EtapaCandidatoDto)
  etapa?: EtapaCandidatoDto;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CreateEntrevistaDto {
  @IsDateString()
  data!: string;

  @IsOptional()
  @IsUUID()
  entrevistadorId?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ConverterCandidatoDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsString()
  @Matches(/^@?\w{5,32}$/, { message: 'telegramUsername deve ser um username válido do Telegram (5-32 caracteres)' })
  telegramUsername!: string;
}
