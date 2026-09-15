import { PartialType } from '@nestjs/mapped-types';
import { AlocacaoStatus, EstadoEquipamento } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAlocacaoDto {
  @IsUUID()
  equipamentoId!: string;

  @IsUUID()
  colaboradorId!: string;

  @Matches(DATA, { message: 'dataInicio deve estar no formato YYYY-MM-DD' })
  dataInicio!: string;

  /** Sem status, a entrega nasce PENDENTE — o item ainda não saiu da mão do RH. */
  @IsOptional()
  @IsEnum(AlocacaoStatus)
  status?: AlocacaoStatus;

  @IsOptional()
  @IsEnum(EstadoEquipamento)
  estadoNaEntrega?: EstadoEquipamento;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}

export class UpdateAlocacaoDto extends PartialType(CreateAlocacaoDto) {}

export class DevolverAlocacaoDto {
  @IsOptional()
  @Matches(DATA, { message: 'dataDevolucao deve estar no formato YYYY-MM-DD' })
  dataDevolucao?: string;

  /** Reavaliação do item na volta; sem ela, o estado do equipamento fica como está. */
  @IsOptional()
  @IsEnum(EstadoEquipamento)
  estadoNaDevolucao?: EstadoEquipamento;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoDevolucao?: string;
}
