import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  anexarSolicitacao,
  aprovarSolicitacao,
  cancelarSolicitacao,
  createSolicitacao,
  deleteSolicitacao,
  getMinhasSolicitacoes,
  getSolicitacoes,
  rejeitarSolicitacao,
  updateSolicitacao,
} from '../api/solicitacoes.api';
import type { CreateSolicitacaoInput, FiltrosSolicitacao, UpdateSolicitacaoInput } from '../types/solicitacao.types';

const SOLICITACOES_KEY = ['solicitacoes'] as const;
const MINHAS_SOLICITACOES_KEY = ['solicitacoes', 'minhas'] as const;

function invalidateSolicitacoes(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: SOLICITACOES_KEY });
  queryClient.invalidateQueries({ queryKey: MINHAS_SOLICITACOES_KEY });
}

export function useSolicitacoes(filtros: FiltrosSolicitacao = {}) {
  return useQuery({ queryKey: [...SOLICITACOES_KEY, filtros], queryFn: () => getSolicitacoes(filtros) });
}

export function useMinhasSolicitacoes(filtros: FiltrosSolicitacao = {}) {
  return useQuery({
    queryKey: [...MINHAS_SOLICITACOES_KEY, filtros],
    queryFn: () => getMinhasSolicitacoes(filtros),
  });
}

export function useCreateSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSolicitacaoInput) => createSolicitacao(input),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}

export function useUpdateSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSolicitacaoInput }) => updateSolicitacao(id, input),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}

export function useAprovarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aprovarSolicitacao(id),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}

export function useRejeitarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejeitarSolicitacao(id),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}

export function useCancelarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarSolicitacao(id),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}

export function useDeleteSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSolicitacao(id),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}

export function useAnexarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) => anexarSolicitacao(id, arquivo),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}
