export interface TipoSolicitacao {
  id: string;
  nome: string;
  ativo: boolean;
  requerAprovacao: boolean;
  contaComoAfastamento: boolean;
  ehFolga: boolean;
  criadoEm: string;
}

export interface CreateTipoSolicitacaoInput {
  nome: string;
  requerAprovacao?: boolean;
  contaComoAfastamento?: boolean;
  ehFolga?: boolean;
}

export interface UpdateTipoSolicitacaoInput extends Partial<CreateTipoSolicitacaoInput> {
  ativo?: boolean;
}
