import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSubAreaDto } from './create-subarea.dto';

export class UpdateSubAreaDto extends PartialType(CreateSubAreaDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
