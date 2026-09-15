import { httpClient } from '../../../api/httpClient';
import type { Notificacao } from '../types/notificacao.types';

export function getNotificacoes() {
  return httpClient<Notificacao[]>('/notificacoes');
}

export function getContagemNaoLidas() {
  return httpClient<{ total: number }>('/notificacoes/nao-lidas/contagem');
}

export function marcarComoLida(id: string) {
  return httpClient<Notificacao>(`/notificacoes/${id}/lida`, { method: 'PATCH' });
}

export function marcarTodasComoLidas() {
  return httpClient<{ ok: boolean }>('/notificacoes/lidas', { method: 'PATCH' });
}

export function limparNotificacoes() {
  return httpClient<{ ok: boolean }>('/notificacoes', { method: 'DELETE' });
}
