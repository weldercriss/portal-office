import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDepartamento,
  deleteDepartamentoPermanently,
  deactivateDepartamento,
  getDepartamentos,
  updateDepartamento,
} from '../api/departamentos.api';
import type { CreateDepartamentoInput, UpdateDepartamentoInput } from '../types/departamento.types';

const DEPARTAMENTOS_KEY = ['departamentos'] as const;

export function useDepartamentos() {
  return useQuery({ queryKey: DEPARTAMENTOS_KEY, queryFn: getDepartamentos });
}

export function useCreateDepartamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartamentoInput) => createDepartamento(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPARTAMENTOS_KEY }),
  });
}

export function useUpdateDepartamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartamentoInput }) => updateDepartamento(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPARTAMENTOS_KEY }),
  });
}

export function useDeactivateDepartamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateDepartamento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPARTAMENTOS_KEY }),
  });
}

export function useDeleteDepartamentoPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartamentoPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEPARTAMENTOS_KEY }),
  });
}
