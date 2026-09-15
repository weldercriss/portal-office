import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum StatusTreinamentoDto {
  PENDENTE = 'PENDENTE',
  CONCLUIDO = 'CONCLUIDO',
}

export class CreateTreinamentoDto {
  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  participanteIds!: string[];
}

export class UpdateParticipacaoDto {
  @IsEnum(StatusTreinamentoDto)
  status!: StatusTreinamentoDto;
}
