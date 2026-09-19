import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { PesquisaTipo } from '@prisma/client';
import { CampoFormularioDto } from '../../common/dto/campo-formulario.dto';

/** Uma pesquisa aceita userIds explícitos OU a equipe de um gestor (expandida na criação) — nunca os dois. */
export class DestinatariosPesquisaDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsUUID()
  gestorId?: string;
}

export class CreatePesquisaDto {
  @IsString()
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsEnum(PesquisaTipo)
  tipo!: PesquisaTipo;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CampoFormularioDto)
  campos!: CampoFormularioDto[];

  @ValidateNested()
  @Type(() => DestinatariosPesquisaDto)
  destinatarios!: DestinatariosPesquisaDto;
}
