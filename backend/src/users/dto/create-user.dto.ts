import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GESTOR = 'GESTOR',
}

export enum StatusColaboradorDto {
  ATIVO = 'ATIVO',
  AFASTADO = 'AFASTADO',
  FERIAS = 'FERIAS',
  DESLIGADO = 'DESLIGADO',
}

export class CreateUserDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsBoolean()
  acessoPlataforma?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsDateString()
  dataAdmissao?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsUUID()
  subAreaId?: string;

  @IsOptional()
  @IsString()
  senioridade?: string;

  @IsOptional()
  @IsBoolean()
  recebeAvisosRH?: boolean;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsUUID()
  gestorId?: string;

  @IsOptional()
  @IsNumberString()
  salario?: string;

  @IsOptional()
  @IsString()
  beneficios?: string;

  @IsOptional()
  @IsEnum(StatusColaboradorDto)
  statusColaborador?: StatusColaboradorDto;

  /** Só usado para desligamento retroativo — sem informar, a virada pra DESLIGADO grava a data atual. */
  @IsOptional()
  @IsDateString()
  dataDesligamento?: string;

  @IsOptional()
  @IsString()
  motivoDesligamento?: string;

  @IsOptional()
  @IsString()
  bancoNome?: string;

  @IsOptional()
  @IsString()
  bancoAgencia?: string;

  @IsOptional()
  @IsString()
  bancoConta?: string;

  @IsOptional()
  @IsString()
  bancoTipoConta?: string;

  @IsString()
  @Matches(/^@?\w{5,32}$/, { message: 'telegramUsername deve ser um username válido do Telegram (5-32 caracteres)' })
  telegramUsername!: string;

  @IsOptional()
  @Matches(/^-?\d+$/, { message: 'telegramChatId deve conter apenas números' })
  telegramChatId?: string;

}
