import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Contrato deliberadamente menor que o administrativo: identidade, status,
 * responsavel e destinatarios sao definidos pelo backend.
 */
export class CreateReservaColaboradorDto {
  @IsUUID()
  salaId!: string;

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

  @IsOptional()
  @IsBoolean()
  notificarTelegram?: boolean;
}
