import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTipoSolicitacao,
  deactivateTipoSolicitacao,
  deleteTipoSolicitacaoPermanently,
  getTiposSolicitacao,
  updateTipoSolicitacao,
} from '../api/tipos-solicitacao.api';
import type { CreateTipoSolicitacaoInput, UpdateTipoSolicitacaoInput } from '../types/tipo-solicitacao.types';

const TIPOS_SOLICITACAO_KEY = ['tipos-solicitacao'] as const;

export function useTiposSolicitacao(all = false) {
  return useQuery({ queryKey: [...TIPOS_SOLICITACAO_KEY, all], queryFn: () => getTiposSolicitacao(all) });
}

export function useCreateTipoSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTipoSolicitacaoInput) => createTipoSolicitacao(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_SOLICITACAO_KEY }),
  });
}

export function useUpdateTipoSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTipoSolicitacaoInput }) => updateTipoSolicitacao(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_SOLICITACAO_KEY }),
  });
}

export function useDeactivateTipoSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateTipoSolicitacao(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_SOLICITACAO_KEY }),
  });
}

export function useDeleteTipoSolicitacaoPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTipoSolicitacaoPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_SOLICITACAO_KEY }),
  });
}
