import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getContagemNaoLidas, getNotificacoes, limparNotificacoes, marcarComoLida, marcarTodasComoLidas } from '../api/notificacoes.api';

export const NOTIFICACOES_KEY = ['notificacoes'] as const;
export const CONTAGEM_NAO_LIDAS_KEY = ['notificacoes', 'contagem'] as const;

export function useNotificacoes() {
  return useQuery({ queryKey: NOTIFICACOES_KEY, queryFn: getNotificacoes });
}

export function useContagemNaoLidas() {
  return useQuery({ queryKey: CONTAGEM_NAO_LIDAS_KEY, queryFn: getContagemNaoLidas });
}

export function useMarcarComoLida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarComoLida(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICACOES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTAGEM_NAO_LIDAS_KEY });
    },
  });
}

export function useMarcarTodasComoLidas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marcarTodasComoLidas(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICACOES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTAGEM_NAO_LIDAS_KEY });
    },
  });
}

export function useLimparNotificacoes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => limparNotificacoes(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICACOES_KEY });
      queryClient.invalidateQueries({ queryKey: CONTAGEM_NAO_LIDAS_KEY });
    },
  });
}
