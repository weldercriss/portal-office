import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsBoolean()
  fazPlantao?: boolean;

  @IsOptional()
  @IsUUID()
  responsavelId?: string | null;
}
