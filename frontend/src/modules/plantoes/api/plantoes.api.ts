import { httpClient } from '../../../api/httpClient';
import type {
  CreatePlantaoInput,
  CreatePlantaoResult,
  Plantao,
  TrocaPlantao,
  UpdatePlantaoInput,
} from '../types/plantao.types';

export interface FiltrosPlantao {
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
}

function buildQuery(filtros: FiltrosPlantao) {
  const params = new URLSearchParams();
  if (filtros.userId) params.set('userId', filtros.userId);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.from) params.set('from', filtros.from);
  if (filtros.to) params.set('to', filtros.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getPlantoes(filtros: FiltrosPlantao = {}) {
  return httpClient<Plantao[]>(`/plantoes${buildQuery(filtros)}`);
}

export function getPlantao(id: string) {
  return httpClient<Plantao>(`/plantoes/${id}`);
}

export function createPlantao(input: CreatePlantaoInput) {
  return httpClient<CreatePlantaoResult>('/plantoes', { method: 'POST', body: input });
}

export function updatePlantao(id: string, input: UpdatePlantaoInput) {
  return httpClient<Plantao>(`/plantoes/${id}`, { method: 'PATCH', body: input });
}

export function deletePlantao(id: string) {
  return httpClient<{ ok: boolean }>(`/plantoes/${id}`, { method: 'DELETE' });
}

export function removeSerie(serieId: string) {
  return httpClient<{ ok: boolean; removidos: number }>(`/plantoes/serie/${serieId}`, { method: 'DELETE' });
}

export function getPlantoesDisponiveisParaTroca(id: string) {
  return httpClient<Plantao[]>(`/plantoes/${id}/trocas-disponiveis`);
}

export function solicitarTroca(id: string, plantaoDestinoId: string) {
  return httpClient<TrocaPlantao>(`/plantoes/${id}/trocas`, { method: 'POST', body: { plantaoDestinoId } });
}

export function getTrocas() {
  return httpClient<TrocaPlantao[]>('/plantoes/trocas');
}

export function aceitarTroca(id: string) {
  return httpClient<TrocaPlantao>(`/plantoes/trocas/${id}/aceitar`, { method: 'POST' });
}

export function rejeitarTroca(id: string) {
  return httpClient<TrocaPlantao>(`/plantoes/trocas/${id}/rejeitar`, { method: 'POST' });
}
