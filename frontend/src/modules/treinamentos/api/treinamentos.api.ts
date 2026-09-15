import { httpClient } from '../../../api/httpClient';
import type { CreateTreinamentoInput, StatusTreinamento, Treinamento } from '../types/treinamento.types';

export const getTreinamentos = () => httpClient<Treinamento[]>('/treinamentos');
export const getMeusTreinamentos = () => httpClient<Treinamento[]>('/treinamentos/me');
export const createTreinamento = (input: CreateTreinamentoInput) =>
  httpClient<Treinamento>('/treinamentos', { method: 'POST', body: input });
export const deleteTreinamento = (id: string) => httpClient<{ success: boolean }>(`/treinamentos/${id}`, { method: 'DELETE' });
export const atualizarParticipacao = (treinamentoId: string, userId: string, status: StatusTreinamento) =>
  httpClient(`/treinamentos/${treinamentoId}/participantes/${userId}`, { method: 'PATCH', body: { status } });
