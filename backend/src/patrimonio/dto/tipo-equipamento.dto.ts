import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTipoEquipamentoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nome!: string;

  /** String vazia limpa o campo. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descricao?: string;

  @IsOptional()
  @IsBoolean()
  exigeTermo?: boolean;
}

export class UpdateTipoEquipamentoDto extends PartialType(CreateTipoEquipamentoDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
