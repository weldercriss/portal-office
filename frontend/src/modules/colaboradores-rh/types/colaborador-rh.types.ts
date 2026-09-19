export interface Dependente {
  id: string;
  userId: string;
  nome: string;
  parentesco: string;
  dataNascimento: string | null;
  criadoEm: string;
}

export interface CreateDependenteInput {
  nome: string;
  parentesco: string;
  dataNascimento?: string;
}

export interface HistoricoProfissional {
  id: string;
  userId: string;
  cargo: string;
  departamento: string | null;
  empresa: string | null;
  externo: boolean;
  dataInicio: string;
  dataFim: string | null;
  observacao: string | null;
  criadoEm: string;
}

export interface CreateHistoricoInput {
  cargo: string;
  departamento?: string;
  empresa?: string;
  externo?: boolean;
  dataInicio: string;
  dataFim?: string;
  observacao?: string;
}

export interface UpdateHistoricoInput {
  cargo?: string;
  departamento?: string;
  empresa?: string;
  externo?: boolean;
  dataInicio?: string;
  /** null limpa a data final (marca o cargo como atual). */
  dataFim?: string | null;
  observacao?: string;
}

export interface DadosSensiveis {
  tipoSanguineo: string | null;
  alergias: string | null;
  condicoesSaude: string | null;
}

export type UpdateDadosSensiveisInput = Partial<DadosSensiveis>;

export type StatusChecklistItem = 'PENDENTE' | 'CONCLUIDO';
export type TipoChecklist = 'ADMISSAO' | 'DESLIGAMENTO';

export interface ChecklistItem {
  id: string;
  userId: string;
  tipo: TipoChecklist;
  categoria: string | null;
  titulo: string;
  status: StatusChecklistItem;
  /** Nunca vem preenchido pra quem não é ADMIN/MASTER. */
  observacaoInterna?: string | null;
  concluidoEm: string | null;
  criadoEm: string;
}

export interface CategoriaDocumentoResumo {
  id: string;
  nome: string;
}

export interface DocumentoColaborador {
  id: string;
  userId: string;
  categoriaId: string;
  categoria: CategoriaDocumentoResumo;
  nome: string;
  arquivoNome: string;
  validade: string | null;
  /** Mês/ano de competência (ex.: contracheque) — null para documentos sem competência. */
  competencia: string | null;
  criadoPorId: string;
  criadoEm: string;
}

