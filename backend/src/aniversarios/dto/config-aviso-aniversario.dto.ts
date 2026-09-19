import { ArrayNotEmpty, IsInt, Min } from 'class-validator';

export class UpdateConfigAvisoAniversarioDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  diasAntecedencia!: number[];
}
