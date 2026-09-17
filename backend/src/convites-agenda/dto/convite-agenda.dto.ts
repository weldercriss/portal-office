import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsEmail, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

/** Limite da seção 8.4 do plano: além de 200, o Google também pode limitar convites em massa. */
const MAX_DESTINATARIOS = 200;

export class VerificarConviteAgendaDto {
  @IsISO8601()
  inicio!: string;

  @IsISO8601()
  fim!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_DESTINATARIOS)
  @IsEmail({}, { each: true })
  destinatarioEmails!: string[];
}

export class CreateConviteAgendaDto extends VerificarConviteAgendaDto {
  @IsString()
  @MaxLength(120)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  local?: string;

  /** Só decidido na criação; edição não muda se o evento pede link do Meet. */
  @IsOptional()
  @IsBoolean()
  comMeet?: boolean;
}

/** Destinatários não mudam aqui — só os dados do evento (nem se ele tem Meet). */
export class UpdateConviteAgendaDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  local?: string;

  @IsOptional()
  @IsISO8601()
  inicio?: string;

  @IsOptional()
  @IsISO8601()
  fim?: string;
}
