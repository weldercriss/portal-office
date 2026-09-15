import { IsBoolean } from 'class-validator';

export class PreferenciaAgendaDto {
  @IsBoolean()
  ativa!: boolean;
}
