import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/pesquisas.api';
import type { CreatePesquisaInput, ResponderPesquisaInput } from '../types/pesquisa.types';

const PESQUISAS_KEY = ['pesquisas'] as const;
const PENDENTES_KEY = ['pesquisas', 'pendentes'] as const;

export function usePesquisasPendentes() {
  return useQuery({ queryKey: PENDENTES_KEY, queryFn: api.getPesquisasPendentes });
}

export function usePesquisas() {
  return useQuery({ queryKey: PESQUISAS_KEY, queryFn: api.getPesquisas });
}

export function useResultadoPesquisa(id: string | undefined) {
  return useQuery({
    queryKey: [...PESQUISAS_KEY, id, 'resultado'],
    queryFn: () => api.getResultadoPesquisa(id as string),
    enabled: !!id,
  });
}

export function useCreatePesquisa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePesquisaInput) => api.createPesquisa(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PESQUISAS_KEY }),
  });
}

export function useEncerrarPesquisa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.encerrarPesquisa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PESQUISAS_KEY }),
  });
}

export function useDeletePesquisa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePesquisa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PESQUISAS_KEY }),
  });
}

export function useResponderPesquisa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResponderPesquisaInput }) => api.responderPesquisa(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PENDENTES_KEY }),
  });
}
