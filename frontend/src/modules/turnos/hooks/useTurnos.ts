import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTurno,
  deactivateTurno,
  deleteTurnoPermanently,
  getTurnos,
  updateTurno,
} from '../api/turnos.api';
import type { CreateTurnoInput, UpdateTurnoInput } from '../types/turno.types';

const TURNOS_KEY = ['turnos'] as const;

export function useTurnos(all = false) {
  return useQuery({ queryKey: [...TURNOS_KEY, all], queryFn: () => getTurnos(all) });
}

export function useCreateTurno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTurnoInput) => createTurno(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TURNOS_KEY }),
  });
}

export function useUpdateTurno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTurnoInput }) => updateTurno(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TURNOS_KEY }),
  });
}

export function useDeactivateTurno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateTurno(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TURNOS_KEY }),
  });
}

export function useDeleteTurnoPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTurnoPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TURNOS_KEY }),
  });
}
