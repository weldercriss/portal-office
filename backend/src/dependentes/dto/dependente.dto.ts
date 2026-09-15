import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDependenteDto {
  @IsString()
  nome!: string;

  @IsString()
  parentesco!: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;
}

export class UpdateDependenteDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  parentesco?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;
}
