import type { CampoFormulario } from '../../tipos-solicitacao/types/tipo-solicitacao.types';

export type PesquisaTipo = 'NPS' | 'NR1' | 'FEEDBACK_1_1' | 'GERAL';

export const TIPOS_PESQUISA: { value: PesquisaTipo; label: string }[] = [
  { value: 'NPS', label: 'NPS' },
  { value: 'NR1', label: 'NR-1' },
  { value: 'FEEDBACK_1_1', label: 'Feedback 1:1' },
  { value: 'GERAL', label: 'Geral' },
];

export interface Pesquisa {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: PesquisaTipo;
  ativa: boolean;
  campos: CampoFormulario[];
  criadoPor: { id: string; nome: string };
  criadoEm: string;
  _count?: { convites: number; respostas: number };
}

export interface AgregadoCampoPesquisa {
  campoId: string;
  label: string;
  tipo: string;
  /** Só em campos SELECAO. */
  contagemOpcoes?: { opcao: string; total: number }[];
  /** Só em campos NUMERO. */
  media?: number | null;
  /** Lista solta de valores, sem vínculo a quem respondeu — anônimo por design. */
  valores?: (string | number)[];
}

export interface ResultadoPesquisa {
  pesquisa: Pesquisa;
  totalConvites: number;
  totalRespondidas: number;
  percentualRespondido: number;
  agregados: AgregadoCampoPesquisa[];
}

/** userIds explícitos OU a equipe de um gestor (expandida no backend) — nunca os dois. */
export interface DestinatariosPesquisaInput {
  userIds?: string[];
  gestorId?: string;
}

export interface CreatePesquisaInput {
  titulo: string;
  descricao?: string;
  tipo: PesquisaTipo;
  campos: CampoFormulario[];
  destinatarios: DestinatariosPesquisaInput;
}

export interface ResponderPesquisaInput {
  respostas: Record<string, string>;
}
