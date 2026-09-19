import { httpClient } from '../../../api/httpClient';
import type { CreatePesquisaInput, Pesquisa, ResponderPesquisaInput, ResultadoPesquisa } from '../types/pesquisa.types';

const BASE = '/pesquisas';

export function getPesquisasPendentes() {
  return httpClient<Pesquisa[]>(`${BASE}/pendentes`);
}

export function getPesquisas() {
  return httpClient<Pesquisa[]>(BASE);
}

export function getResultadoPesquisa(id: string) {
  return httpClient<ResultadoPesquisa>(`${BASE}/${id}/resultado`);
}

export function createPesquisa(input: CreatePesquisaInput) {
  return httpClient<Pesquisa>(BASE, { method: 'POST', body: input });
}

export function encerrarPesquisa(id: string) {
  return httpClient<Pesquisa>(`${BASE}/${id}/encerrar`, { method: 'PATCH' });
}

export function deletePesquisa(id: string) {
  return httpClient<{ success: boolean }>(`${BASE}/${id}`, { method: 'DELETE' });
}

export function responderPesquisa(id: string, input: ResponderPesquisaInput) {
  return httpClient<{ ok: boolean }>(`${BASE}/${id}/responder`, { method: 'POST', body: input });
}
