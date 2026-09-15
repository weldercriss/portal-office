import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelarReserva,
  createReserva,
  createSala,
  deactivateSala,
  deleteReserva,
  deleteSalaPermanently,
  getHorarios,
  getMinhasReservas,
  getReservas,
  getSalas,
  updateReserva,
  updateSala,
} from '../api/agendamento.api';
import type {
  CreateReservaInput,
  CreateSalaInput,
  FiltrosReserva,
  UpdateReservaInput,
  UpdateSalaInput,
} from '../types/agendamento.types';

const SALAS_KEY = ['agendamento', 'salas'] as const;
export const RESERVAS_KEY = ['agendamento', 'reservas'] as const;
export const HORARIOS_KEY = ['agendamento', 'horarios'] as const;

/**
 * Mexer numa reserva muda os horários livres: as duas listas caem juntas.
 * Exportada porque o socket de tempo real (`useAgendamentoSocket`) chama o
 * mesmo invalidamento quando outra pessoa muda algo na tela.
 */
export function invalidarAgenda(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: RESERVAS_KEY });
  queryClient.invalidateQueries({ queryKey: HORARIOS_KEY });
}

export function useSalas(all = false) {
  return useQuery({ queryKey: [...SALAS_KEY, all], queryFn: () => getSalas(all) });
}

export function useCreateSala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalaInput) => createSala(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALAS_KEY });
      invalidarAgenda(queryClient);
    },
  });
}

export function useUpdateSala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSalaInput }) => updateSala(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALAS_KEY });
      invalidarAgenda(queryClient);
    },
  });
}

export function useDeactivateSala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateSala(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SALAS_KEY }),
  });
}

export function useDeleteSalaPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSalaPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SALAS_KEY }),
  });
}

export function useReservas(filtros: FiltrosReserva = {}) {
  return useQuery({ queryKey: [...RESERVAS_KEY, filtros], queryFn: () => getReservas(filtros) });
}

export function useMinhasReservas(filtros: Omit<FiltrosReserva, 'solicitanteId'> = {}) {
  return useQuery({ queryKey: [...RESERVAS_KEY, 'minhas', filtros], queryFn: () => getMinhasReservas(filtros) });
}

/** Só busca quando há sala e data: sem os dois não existe grade para mostrar. */
export function useHorarios(salaId: string | undefined, data: string | undefined, ignorarReservaId?: string) {
  return useQuery({
    queryKey: [...HORARIOS_KEY, salaId, data, ignorarReservaId],
    queryFn: () => getHorarios(salaId as string, data as string, ignorarReservaId),
    enabled: !!salaId && !!data,
  });
}

export function useCreateReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservaInput) => createReserva(input),
    onSuccess: () => invalidarAgenda(queryClient),
  });
}

export function useUpdateReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReservaInput }) => updateReserva(id, input),
    onSuccess: () => invalidarAgenda(queryClient),
  });
}

export function useCancelarReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => cancelarReserva(id, motivo),
    onSuccess: () => invalidarAgenda(queryClient),
  });
}

export function useDeleteReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReserva(id),
    onSuccess: () => invalidarAgenda(queryClient),
  });
}
