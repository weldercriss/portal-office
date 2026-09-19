import { IsOptional, IsString } from 'class-validator';

export class UpdateDadosSensiveisDto {
  @IsOptional()
  @IsString()
  tipoSanguineo?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @IsString()
  condicoesSaude?: string;
}
