import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum StatusChecklistItemDto {
  PENDENTE = 'PENDENTE',
  CONCLUIDO = 'CONCLUIDO',
}

export class CreateChecklistItemDto {
  @IsString()
  titulo!: string;
}

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsEnum(StatusChecklistItemDto)
  status?: StatusChecklistItemDto;
}
