import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aceitarTroca,
  createPlantao,
  deletePlantao,
  getPlantao,
  getPlantoes,
  getPlantoesDisponiveisParaTroca,
  getTrocas,
  rejeitarTroca,
  removeSerie,
  solicitarTroca,
  updatePlantao,
  type FiltrosPlantao,
} from '../api/plantoes.api';
import type { CreatePlantaoInput, UpdatePlantaoInput } from '../types/plantao.types';

const PLANTOES_KEY = ['plantoes'] as const;
const TROCAS_KEY = ['plantoes', 'trocas'] as const;

export function usePlantoes(filtros: FiltrosPlantao = {}) {
  return useQuery({
    queryKey: [...PLANTOES_KEY, filtros],
    queryFn: () => getPlantoes(filtros),
  });
}

export function usePlantao(id: string | null) {
  return useQuery({
    queryKey: [...PLANTOES_KEY, id],
    queryFn: () => getPlantao(id as string),
    enabled: !!id,
  });
}

export function useCreatePlantao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlantaoInput) => createPlantao(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANTOES_KEY }),
  });
}

export function useUpdatePlantao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlantaoInput }) => updatePlantao(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANTOES_KEY }),
  });
}

export function useDeletePlantao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlantao(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANTOES_KEY }),
  });
}

export function useRemoveSerie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serieId: string) => removeSerie(serieId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANTOES_KEY }),
  });
}

export function usePlantoesDisponiveisParaTroca(id: string | null) {
  return useQuery({
    queryKey: [...PLANTOES_KEY, id, 'trocas-disponiveis'],
    queryFn: () => getPlantoesDisponiveisParaTroca(id as string),
    enabled: !!id,
  });
}

export function useSolicitarTroca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plantaoDestinoId }: { id: string; plantaoDestinoId: string }) =>
      solicitarTroca(id, plantaoDestinoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TROCAS_KEY }),
  });
}

export function useTrocas() {
  return useQuery({ queryKey: TROCAS_KEY, queryFn: getTrocas });
}

export function useAceitarTroca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aceitarTroca(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TROCAS_KEY });
      queryClient.invalidateQueries({ queryKey: PLANTOES_KEY });
    },
  });
}

export function useRejeitarTroca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejeitarTroca(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TROCAS_KEY }),
  });
}
