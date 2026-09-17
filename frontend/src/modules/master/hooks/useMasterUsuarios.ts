import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMasterUsuario, getMasterUsuarios } from '../api/master.api';
import type { CreateMasterUsuarioInput } from '../types/master.types';

const MASTER_USUARIOS_KEY = ['master-usuarios'] as const;

export function useMasterUsuarios() {
  return useQuery({ queryKey: MASTER_USUARIOS_KEY, queryFn: getMasterUsuarios });
}

export function useCreateMasterUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMasterUsuarioInput) => createMasterUsuario(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MASTER_USUARIOS_KEY }),
  });
}
