import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoriaDocumentoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nome!: string;
}

export class UpdateCategoriaDocumentoDto extends PartialType(CreateCategoriaDocumentoDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
