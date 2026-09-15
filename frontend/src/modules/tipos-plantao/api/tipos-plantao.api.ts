import { httpClient } from '../../../api/httpClient';
import type { CreateTipoPlantaoInput, TipoPlantao, UpdateTipoPlantaoInput } from '../types/tipo-plantao.types';

export function getTiposPlantao(all = false) {
  return httpClient<TipoPlantao[]>(`/tipos-plantao${all ? '?all=true' : ''}`);
}

export function createTipoPlantao(input: CreateTipoPlantaoInput) {
  return httpClient<TipoPlantao>('/tipos-plantao', { method: 'POST', body: input });
}

export function updateTipoPlantao(id: string, input: UpdateTipoPlantaoInput) {
  return httpClient<TipoPlantao>(`/tipos-plantao/${id}`, { method: 'PATCH', body: input });
}

export function deactivateTipoPlantao(id: string) {
  return httpClient<TipoPlantao>(`/tipos-plantao/${id}`, { method: 'DELETE' });
}

export function deleteTipoPlantaoPermanently(id: string) {
  return httpClient<{ success: boolean }>(`/tipos-plantao/${id}/permanent`, { method: 'DELETE' });
}
