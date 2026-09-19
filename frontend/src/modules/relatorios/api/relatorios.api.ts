import { httpClient } from '../../../api/httpClient';
import type { FiltroTurnover, RelatorioColaboradores, TurnoverMes } from '../types/relatorios.types';

function querystring(filtros: FiltroTurnover): string {
  const params = new URLSearchParams();
  if (filtros.de) params.set('de', filtros.de);
  if (filtros.ate) params.set('ate', filtros.ate);
  if (filtros.departamentoId) params.set('departamentoId', filtros.departamentoId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const getTurnover = (filtros: FiltroTurnover) =>
  httpClient<TurnoverMes[]>(`/relatorios/turnover${querystring(filtros)}`);

export const getColaboradoresRelatorio = (departamentoId?: string) =>
  httpClient<RelatorioColaboradores>(
    `/relatorios/colaboradores${departamentoId ? `?departamentoId=${departamentoId}` : ''}`,
  );
