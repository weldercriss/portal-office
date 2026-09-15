import { IsArray, IsString } from 'class-validator';

export class SetGroupRotinasDto {
  @IsArray()
  @IsString({ each: true })
  rotinas!: string[];
}
