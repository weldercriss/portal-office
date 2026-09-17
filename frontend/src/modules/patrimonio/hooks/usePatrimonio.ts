import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  anexarTermo,
  anexarTermoLote,
  cancelarAlocacao,
  createAlocacao,
  createEquipamento,
  createTipoEquipamento,
  deactivateEquipamento,
  deactivateTipoEquipamento,
  deleteAlocacao,
  deleteEquipamentoPermanently,
  deleteTipoEquipamentoPermanently,
  devolverAlocacao,
  devolverTudoDoColaborador,
  getAlocacoes,
  getEquipamentos,
  getMeusEquipamentos,
  getResumoEquipamentos,
  getTiposEquipamento,
  removerTermo,
  updateAlocacao,
  updateEquipamento,
  updateTipoEquipamento,
} from '../api/patrimonio.api';
import type {
  CreateAlocacaoInput,
  CreateEquipamentoInput,
  CreateTipoEquipamentoInput,
  DevolverAlocacaoInput,
  FiltrosAlocacao,
  FiltrosEquipamento,
  UpdateAlocacaoInput,
  UpdateEquipamentoInput,
  UpdateTipoEquipamentoInput,
} from '../types/patrimonio.types';

const TIPOS_KEY = ['patrimonio', 'tipos'] as const;
const EQUIPAMENTOS_KEY = ['patrimonio', 'equipamentos'] as const;
const RESUMO_KEY = ['patrimonio', 'equipamentos', 'resumo'] as const;
const ALOCACOES_KEY = ['patrimonio', 'alocacoes'] as const;

/** Toda mutação de alocação também muda a situação do equipamento no inventário. */
function invalidarEstoque(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: EQUIPAMENTOS_KEY });
  queryClient.invalidateQueries({ queryKey: RESUMO_KEY });
  queryClient.invalidateQueries({ queryKey: ALOCACOES_KEY });
}

// Tipos de equipamento
export function useTiposEquipamento(all = false) {
  return useQuery({ queryKey: [...TIPOS_KEY, all], queryFn: () => getTiposEquipamento(all) });
}

export function useCreateTipoEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTipoEquipamentoInput) => createTipoEquipamento(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useUpdateTipoEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTipoEquipamentoInput }) => updateTipoEquipamento(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useDeactivateTipoEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateTipoEquipamento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useDeleteTipoEquipamentoPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTipoEquipamentoPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

// Equipamentos (inventário)
export function useEquipamentos(filtros: FiltrosEquipamento = {}) {
  return useQuery({ queryKey: [...EQUIPAMENTOS_KEY, filtros], queryFn: () => getEquipamentos(filtros) });
}

export function useResumoEquipamentos() {
  return useQuery({ queryKey: RESUMO_KEY, queryFn: getResumoEquipamentos });
}

export function useCreateEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEquipamentoInput) => createEquipamento(input),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useUpdateEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEquipamentoInput }) => updateEquipamento(id, input),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useDeactivateEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEquipamento(id),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useDeleteEquipamentoPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEquipamentoPermanently(id),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

// Alocações (vínculo com colaboradores)
export function useAlocacoes(filtros: FiltrosAlocacao = {}) {
  return useQuery({ queryKey: [...ALOCACOES_KEY, filtros], queryFn: () => getAlocacoes(filtros) });
}

export function useMeusEquipamentos(ativas = true) {
  return useQuery({ queryKey: [...ALOCACOES_KEY, 'meus', ativas], queryFn: () => getMeusEquipamentos(ativas) });
}

export function useCreateAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlocacaoInput) => createAlocacao(input),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useUpdateAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAlocacaoInput }) => updateAlocacao(id, input),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useDevolverAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: DevolverAlocacaoInput }) => devolverAlocacao(id, input),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useCancelarAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivoDevolucao }: { id: string; motivoDevolucao?: string }) =>
      cancelarAlocacao(id, motivoDevolucao),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useDevolverTudoDoColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, motivoDevolucao }: { colaboradorId: string; motivoDevolucao?: string }) =>
      devolverTudoDoColaborador(colaboradorId, motivoDevolucao),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useDeleteAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlocacao(id),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useAnexarTermo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) => anexarTermo(id, arquivo),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useAnexarTermoLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, arquivo }: { ids: string[]; arquivo: File }) => anexarTermoLote(ids, arquivo),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}

export function useRemoverTermo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerTermo(id),
    onSuccess: () => invalidarEstoque(queryClient),
  });
}
