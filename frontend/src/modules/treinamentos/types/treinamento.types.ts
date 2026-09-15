export type StatusTreinamento = 'PENDENTE' | 'CONCLUIDO';

export interface TreinamentoParticipante {
  id: string;
  treinamentoId: string;
  userId: string;
  status: StatusTreinamento;
  concluidoEm: string | null;
  user: { id: string; nome: string };
}

export interface Treinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  criadoEm: string;
  participantes: TreinamentoParticipante[];
}

export interface CreateTreinamentoInput {
  titulo: string;
  descricao?: string;
  participanteIds: string[];
}
