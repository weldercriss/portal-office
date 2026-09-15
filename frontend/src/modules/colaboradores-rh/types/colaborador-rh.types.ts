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
  dataInicio: string;
  dataFim: string | null;
  observacao: string | null;
  criadoEm: string;
}

export interface CreateHistoricoInput {
  cargo: string;
  departamento?: string;
  dataInicio: string;
  dataFim?: string;
  observacao?: string;
}

export type StatusChecklistItem = 'PENDENTE' | 'CONCLUIDO';

export interface ChecklistItem {
  id: string;
  userId: string;
  titulo: string;
  status: StatusChecklistItem;
  concluidoEm: string | null;
  criadoEm: string;
}

export type TipoDocumentoColaborador = 'CONTRATO' | 'COMPROVANTE' | 'POLITICA' | 'HOLERITE' | 'ASSINADO' | 'OUTRO';

export const TIPOS_DOCUMENTO: { value: TipoDocumentoColaborador; label: string }[] = [
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'COMPROVANTE', label: 'Comprovante' },
  { value: 'POLITICA', label: 'Política interna' },
  { value: 'HOLERITE', label: 'Holerite' },
  { value: 'ASSINADO', label: 'Documento assinado' },
  { value: 'OUTRO', label: 'Outro' },
];

export interface DocumentoColaborador {
  id: string;
  userId: string;
  tipo: TipoDocumentoColaborador;
  nome: string;
  arquivoNome: string;
  validade: string | null;
  criadoPorId: string;
  criadoEm: string;
}

