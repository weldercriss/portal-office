import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTelegramConfigDto {
  @IsString()
  @MinLength(10)
  botToken!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
