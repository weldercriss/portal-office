import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdicionarTelegramGrupoDto {
  @IsString()
  @MinLength(1)
  chatId!: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  nome?: string;
}
