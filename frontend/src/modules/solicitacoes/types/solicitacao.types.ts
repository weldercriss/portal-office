import type { TipoSolicitacao } from '../../tipos-solicitacao/types/tipo-solicitacao.types';

export type SolicitacaoStatus = 'SOLICITADA' | 'APROVADA' | 'REJEITADA' | 'CANCELADA';

export interface SolicitacaoUsuarioResumo {
  id: string;
  nome: string;
  email?: string;
}

export interface Solicitacao {
  id: string;
  userId: string;
  user: SolicitacaoUsuarioResumo;
  responsavelId: string | null;
  responsavel: SolicitacaoUsuarioResumo | null;
  tipoId: string;
  tipo: TipoSolicitacao;
  dataInicio: string;
  dataFim: string | null;
  descricao: string | null;
  anexoNome: string | null;
  status: SolicitacaoStatus;
  decididoPorId: string | null;
  decididoPor: SolicitacaoUsuarioResumo | null;
  decididoEm: string | null;
  registradoPorId: string;
  registradoPor: SolicitacaoUsuarioResumo;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateSolicitacaoInput {
  userId?: string;
  responsavelId?: string | null;
  tipoId: string;
  dataInicio: string;
  dataFim?: string;
  descricao?: string;
}

export type UpdateSolicitacaoInput = Partial<CreateSolicitacaoInput>;

export interface FiltrosSolicitacao {
  userId?: string;
  tipoId?: string;
  status?: string;
  from?: string;
  to?: string;
  contaComoAfastamento?: boolean;
  ehFolga?: boolean;
}
