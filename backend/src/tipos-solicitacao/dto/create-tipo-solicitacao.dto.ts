import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CampoFormularioDto } from '../../common/dto/campo-formulario.dto';

export class CreateTipoSolicitacaoDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsBoolean()
  requerAprovacao?: boolean;

  @IsOptional()
  @IsBoolean()
  contaComoAfastamento?: boolean;

  @IsOptional()
  @IsBoolean()
  ehFolga?: boolean;

  @IsOptional()
  @IsBoolean()
  usaFormulario?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoFormularioDto)
  camposFormulario?: CampoFormularioDto[];

  @IsOptional()
  @IsBoolean()
  permiteLinkPublico?: boolean;

  @IsOptional()
  @IsBoolean()
  ehPreAdmissao?: boolean;
}
