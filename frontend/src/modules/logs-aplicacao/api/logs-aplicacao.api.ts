import { httpClient } from '../../../api/httpClient';
import type { FiltrosLogAplicacao, LogAplicacaoDetalhe, LogsAplicacaoResposta } from '../types/log-aplicacao.types';

const BASE = '/logs-aplicacao';

function buildQuery(filtros: FiltrosLogAplicacao) {
  const params = new URLSearchParams();
  if (filtros.resultado) params.set('resultado', filtros.resultado);
  if (filtros.metodo) params.set('metodo', filtros.metodo);
  if (filtros.statusHttp) params.set('statusHttp', String(filtros.statusHttp));
  if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId);
  if (filtros.busca) params.set('busca', filtros.busca);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getLogsAplicacao(filtros: FiltrosLogAplicacao = {}) {
  return httpClient<LogsAplicacaoResposta>(`${BASE}${buildQuery(filtros)}`);
}

export function getLogAplicacaoDetalhe(id: string) {
  return httpClient<LogAplicacaoDetalhe>(`${BASE}/${id}`);
}
