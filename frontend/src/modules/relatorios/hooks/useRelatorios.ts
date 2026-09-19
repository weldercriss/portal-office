import { useQuery } from '@tanstack/react-query';
import { getColaboradoresRelatorio, getTurnover } from '../api/relatorios.api';
import type { FiltroTurnover } from '../types/relatorios.types';

export function useTurnover(filtros: FiltroTurnover) {
  return useQuery({ queryKey: ['relatorios', 'turnover', filtros], queryFn: () => getTurnover(filtros) });
}

export function useColaboradoresRelatorio(departamentoId?: string) {
  return useQuery({
    queryKey: ['relatorios', 'colaboradores', departamentoId],
    queryFn: () => getColaboradoresRelatorio(departamentoId),
  });
}
