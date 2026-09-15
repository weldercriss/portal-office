import { httpClient, httpClientBlob } from '../../../api/httpClient';
import type {
  CreateSolicitacaoInput,
  FiltrosSolicitacao,
  Solicitacao,
  UpdateSolicitacaoInput,
} from '../types/solicitacao.types';

function buildQuery(filtros: FiltrosSolicitacao) {
  const params = new URLSearchParams();
  if (filtros.userId) params.set('userId', filtros.userId);
  if (filtros.tipoId) params.set('tipoId', filtros.tipoId);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.from) params.set('from', filtros.from);
  if (filtros.to) params.set('to', filtros.to);
  if (filtros.contaComoAfastamento !== undefined) params.set('contaComoAfastamento', String(filtros.contaComoAfastamento));
  if (filtros.ehFolga !== undefined) params.set('ehFolga', String(filtros.ehFolga));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getSolicitacoes(filtros: FiltrosSolicitacao = {}) {
  return httpClient<Solicitacao[]>(`/solicitacoes${buildQuery(filtros)}`);
}

export function getMinhasSolicitacoes(filtros: FiltrosSolicitacao = {}) {
  return httpClient<Solicitacao[]>(`/solicitacoes/minhas${buildQuery(filtros)}`);
}

export function createSolicitacao(input: CreateSolicitacaoInput) {
  return httpClient<Solicitacao>('/solicitacoes', { method: 'POST', body: input });
}

export function updateSolicitacao(id: string, input: UpdateSolicitacaoInput) {
  return httpClient<Solicitacao>(`/solicitacoes/${id}`, { method: 'PATCH', body: input });
}

export function aprovarSolicitacao(id: string) {
  return httpClient<Solicitacao>(`/solicitacoes/${id}/aprovar`, { method: 'PATCH' });
}

export function rejeitarSolicitacao(id: string) {
  return httpClient<Solicitacao>(`/solicitacoes/${id}/rejeitar`, { method: 'PATCH' });
}

export function cancelarSolicitacao(id: string) {
  return httpClient<Solicitacao>(`/solicitacoes/${id}/cancelar`, { method: 'PATCH' });
}

export function deleteSolicitacao(id: string) {
  return httpClient<{ ok: boolean }>(`/solicitacoes/${id}`, { method: 'DELETE' });
}

export function anexarSolicitacao(id: string, arquivo: File) {
  const formData = new FormData();
  formData.set('anexo', arquivo);
  return httpClient<Solicitacao>(`/solicitacoes/${id}/anexo`, { method: 'POST', body: formData });
}

export async function baixarAnexoSolicitacao(id: string): Promise<Blob> {
  return httpClientBlob(`/solicitacoes/${id}/anexo`);
}

export function anexarCampoFormulario(id: string, campoId: string, arquivo: File) {
  const formData = new FormData();
  formData.set('anexo', arquivo);
  return httpClient<Solicitacao>(`/solicitacoes/${id}/formulario-anexo/${campoId}`, { method: 'POST', body: formData });
}

export async function baixarAnexoCampoFormulario(id: string, campoId: string): Promise<Blob> {
  return httpClientBlob(`/solicitacoes/${id}/formulario-anexo/${campoId}`);
}
