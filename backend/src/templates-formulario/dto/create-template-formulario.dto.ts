import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CampoFormularioDto } from '../../common/dto/campo-formulario.dto';

export class CreateTemplateFormularioDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CampoFormularioDto)
  campos!: CampoFormularioDto[];
}
