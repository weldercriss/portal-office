import { httpClient } from '../../../api/httpClient';
import type {
  CreateTipoSolicitacaoInput,
  TipoSolicitacao,
  UpdateTipoSolicitacaoInput,
} from '../types/tipo-solicitacao.types';

export function getTiposSolicitacao(all = false) {
  return httpClient<TipoSolicitacao[]>(`/tipos-solicitacao${all ? '?all=true' : ''}`);
}

export function createTipoSolicitacao(input: CreateTipoSolicitacaoInput) {
  return httpClient<TipoSolicitacao>('/tipos-solicitacao', { method: 'POST', body: input });
}

export function updateTipoSolicitacao(id: string, input: UpdateTipoSolicitacaoInput) {
  return httpClient<TipoSolicitacao>(`/tipos-solicitacao/${id}`, { method: 'PATCH', body: input });
}

export function deactivateTipoSolicitacao(id: string) {
  return httpClient<TipoSolicitacao>(`/tipos-solicitacao/${id}`, { method: 'DELETE' });
}

export function deleteTipoSolicitacaoPermanently(id: string) {
  return httpClient<{ success: boolean }>(`/tipos-solicitacao/${id}/permanent`, { method: 'DELETE' });
}
