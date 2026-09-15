import { IsBoolean, ValidateIf } from 'class-validator';

/** `concedida: true` libera a rotina mesmo sem o departamento ter; `false` revoga
 * mesmo se o departamento tiver; `null` remove o override (volta a herdar do departamento). */
export class SetUserOverrideDto {
  @ValidateIf((o: SetUserOverrideDto) => o.concedida !== null)
  @IsBoolean()
  concedida!: boolean | null;
}
