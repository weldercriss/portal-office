import { PartialType } from '@nestjs/mapped-types';
import { CreateSolicitacaoDto } from './create-solicitacao.dto';

export class UpdateSolicitacaoDto extends PartialType(CreateSolicitacaoDto) {}
