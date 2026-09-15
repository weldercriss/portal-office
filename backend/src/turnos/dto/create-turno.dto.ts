import { IsString, Matches } from 'class-validator';
import { HORA_REGEX } from '../../common/validation/hora';

export class CreateTurnoDto {
  @IsString()
  nome!: string;

  @Matches(HORA_REGEX, { message: 'horaInicio deve estar no formato HH:mm' })
  horaInicio!: string;

  @Matches(HORA_REGEX, { message: 'horaFim deve estar no formato HH:mm' })
  horaFim!: string;
}
