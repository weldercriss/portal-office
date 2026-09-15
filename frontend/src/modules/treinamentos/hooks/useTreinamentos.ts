import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/treinamentos.api';
import type { CreateTreinamentoInput, StatusTreinamento } from '../types/treinamento.types';

export function useTreinamentos() {
  return useQuery({ queryKey: ['treinamentos'], queryFn: api.getTreinamentos });
}
export function useMeusTreinamentos() {
  return useQuery({ queryKey: ['treinamentos', 'me'], queryFn: api.getMeusTreinamentos });
}
export function useCreateTreinamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreinamentoInput) => api.createTreinamento(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treinamentos'] }),
  });
}
export function useDeleteTreinamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTreinamento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treinamentos'] }),
  });
}
export function useAtualizarParticipacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treinamentoId, userId, status }: { treinamentoId: string; userId: string; status: StatusTreinamento }) =>
      api.atualizarParticipacao(treinamentoId, userId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treinamentos'] });
      qc.invalidateQueries({ queryKey: ['treinamentos', 'me'] });
    },
  });
}
