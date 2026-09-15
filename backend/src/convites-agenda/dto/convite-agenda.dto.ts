import { ArrayNotEmpty, IsArray, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class VerificarConviteAgendaDto {
  @IsISO8601()
  inicio!: string;

  @IsISO8601()
  fim!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  destinatarioIds!: string[];
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
}

/** Destinatários não mudam aqui — só os dados do evento. */
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
