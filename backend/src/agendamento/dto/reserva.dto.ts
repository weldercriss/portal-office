import { ReservaDestinatarios, ReservaStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export class CreateReservaDto {
  @IsUUID()
  salaId!: string;

  @IsUUID()
  solicitanteId!: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ReservaDestinatarios)
  destinatariosNotificacao?: ReservaDestinatarios;

  @Matches(DATA, { message: 'data deve estar no formato YYYY-MM-DD' })
  @IsISO8601()
  data!: string;

  @Matches(HORA, { message: 'horaInicio deve estar no formato HH:MM' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFim deve estar no formato HH:MM' })
  horaFim!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  /** Ausente = CONFIRMADA. CANCELADA não é aceita na criação. */
  @IsOptional()
  @IsEnum(ReservaStatus)
  status?: ReservaStatus;

  /** Ausente = true. Falso não manda Telegram (criação, confirmação, cancelamento, lembrete). */
  @IsOptional()
  @IsBoolean()
  notificarTelegram?: boolean;
}

export class UpdateReservaDto {
  @IsOptional()
  @IsUUID()
  salaId?: string;

  @IsOptional()
  @IsUUID()
  solicitanteId?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ReservaDestinatarios)
  destinatariosNotificacao?: ReservaDestinatarios;

  @IsOptional()
  @Matches(DATA, { message: 'data deve estar no formato YYYY-MM-DD' })
  @IsISO8601()
  data?: string;

  @IsOptional()
  @Matches(HORA, { message: 'horaInicio deve estar no formato HH:MM' })
  horaInicio?: string;

  @IsOptional()
  @Matches(HORA, { message: 'horaFim deve estar no formato HH:MM' })
  horaFim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @IsOptional()
  @IsEnum(ReservaStatus)
  status?: ReservaStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoCancelamento?: string;

  @IsOptional()
  @IsBoolean()
  notificarTelegram?: boolean;
}
