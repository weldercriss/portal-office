import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTipoPlantao,
  deactivateTipoPlantao,
  deleteTipoPlantaoPermanently,
  getTiposPlantao,
  updateTipoPlantao,
} from '../api/tipos-plantao.api';
import type { CreateTipoPlantaoInput, UpdateTipoPlantaoInput } from '../types/tipo-plantao.types';

const TIPOS_PLANTAO_KEY = ['tipos-plantao'] as const;

export function useTiposPlantao(all = false) {
  return useQuery({ queryKey: [...TIPOS_PLANTAO_KEY, all], queryFn: () => getTiposPlantao(all) });
}

export function useCreateTipoPlantao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTipoPlantaoInput) => createTipoPlantao(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_PLANTAO_KEY }),
  });
}

export function useUpdateTipoPlantao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTipoPlantaoInput }) => updateTipoPlantao(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_PLANTAO_KEY }),
  });
}

export function useDeactivateTipoPlantao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateTipoPlantao(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_PLANTAO_KEY }),
  });
}

export function useDeleteTipoPlantaoPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTipoPlantaoPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_PLANTAO_KEY }),
  });
}
