import { useQuery } from '@tanstack/react-query';
import { getLogAplicacaoDetalhe, getLogsAplicacao } from '../api/logs-aplicacao.api';
import type { FiltrosLogAplicacao } from '../types/log-aplicacao.types';

const LOGS_APLICACAO_KEY = ['logs-aplicacao'] as const;

/** Moderada para não sobrecarregar a API — a tela também tem atualização manual. */
const REFETCH_INTERVAL_MS = 10_000;

export function useLogsAplicacao(filtros: FiltrosLogAplicacao = {}) {
  return useQuery({
    queryKey: [...LOGS_APLICACAO_KEY, filtros],
    queryFn: () => getLogsAplicacao(filtros),
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}

export function useLogAplicacaoDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: [...LOGS_APLICACAO_KEY, 'detalhe', id],
    queryFn: () => getLogAplicacaoDetalhe(id as string),
    enabled: !!id,
  });
}
