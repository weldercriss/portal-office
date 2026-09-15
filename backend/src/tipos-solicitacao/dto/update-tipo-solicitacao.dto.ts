import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTipoSolicitacaoDto } from './create-tipo-solicitacao.dto';

export class UpdateTipoSolicitacaoDto extends PartialType(CreateTipoSolicitacaoDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
