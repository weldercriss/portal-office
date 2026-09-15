export type CampoFormularioTipo = 'TEXTO' | 'NUMERO' | 'DATA' | 'SELECAO' | 'ARQUIVO';

export interface CampoFormulario {
  id: string;
  label: string;
  tipo: CampoFormularioTipo;
  obrigatorio?: boolean;
  /** Só usado quando tipo === 'SELECAO'. */
  opcoes?: string[];
  /** Mostra a resposta direto na listagem de solicitações, sem precisar abrir o drill-down. */
  exibirNaListagem?: boolean;
}

export interface TemplateFormulario {
  id: string;
  nome: string;
  campos: CampoFormulario[];
  criadoEm: string;
}

export interface TipoSolicitacao {
  id: string;
  nome: string;
  ativo: boolean;
  requerAprovacao: boolean;
  contaComoAfastamento: boolean;
  ehFolga: boolean;
  usaFormulario: boolean;
  camposFormulario: CampoFormulario[] | null;
  permiteLinkPublico: boolean;
  tokenLinkPublico: string | null;
  criadoEm: string;
}

export interface CreateTipoSolicitacaoInput {
  nome: string;
  requerAprovacao?: boolean;
  contaComoAfastamento?: boolean;
  ehFolga?: boolean;
  usaFormulario?: boolean;
  camposFormulario?: CampoFormulario[];
  permiteLinkPublico?: boolean;
}

export interface UpdateTipoSolicitacaoInput extends Partial<CreateTipoSolicitacaoInput> {
  ativo?: boolean;
}
