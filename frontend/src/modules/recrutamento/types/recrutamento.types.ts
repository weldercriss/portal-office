export interface Vaga {
  id: string;
  titulo: string;
  departamentoId: string | null;
  departamento: { id: string; nome: string } | null;
  descricao: string | null;
  aberta: boolean;
  criadoEm: string;
  _count: { candidatos: number };
}

export interface CreateVagaInput {
  titulo: string;
  departamentoId?: string;
  descricao?: string;
}

export interface UpdateVagaInput {
  titulo?: string;
  departamentoId?: string;
  descricao?: string;
  aberta?: boolean;
}

export type EtapaCandidato = 'TRIAGEM' | 'ENTREVISTA' | 'AVALIACAO' | 'APROVADO' | 'REPROVADO';

export const ETAPAS_CANDIDATO: { value: EtapaCandidato; label: string }[] = [
  { value: 'TRIAGEM', label: 'Triagem' },
  { value: 'ENTREVISTA', label: 'Entrevista' },
  { value: 'AVALIACAO', label: 'Avaliação' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
];

export interface Candidato {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  vagaId: string;
  vaga?: { id: string; titulo: string };
  etapa: EtapaCandidato;
  curriculoNome: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  entrevistas?: Entrevista[];
}

export interface CreateCandidatoInput {
  nome: string;
  email: string;
  telefone?: string;
  observacoes?: string;
}

export interface UpdateCandidatoInput {
  nome?: string;
  email?: string;
  telefone?: string;
  etapa?: EtapaCandidato;
  observacoes?: string;
}

export interface Entrevista {
  id: string;
  candidatoId: string;
  data: string;
  entrevistadorId: string | null;
  entrevistador: { id: string; nome: string } | null;
  notas: string | null;
  criadoEm: string;
}

export interface CreateEntrevistaInput {
  data: string;
  entrevistadorId?: string;
  notas?: string;
}

export interface ConverterCandidatoInput {
  groupId?: string;
  telegramUsername: string;
}
