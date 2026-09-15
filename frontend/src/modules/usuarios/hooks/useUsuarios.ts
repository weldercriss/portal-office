import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUsuario,
  deleteUsuarioPermanently,
  deactivateUsuario,
  getMeuPerfil,
  getUsuarios,
  updateUsuario,
  setStatusUsuario,
} from '../api/usuarios.api';
import type { CreateUsuarioInput, UpdateUsuarioInput } from '../types/usuario.types';

const USUARIOS_KEY = ['usuarios'] as const;
const MEU_PERFIL_KEY = ['usuarios', 'me'] as const;

export function useUsuarios() {
  return useQuery({ queryKey: USUARIOS_KEY, queryFn: getUsuarios });
}

export function useMeuPerfil() {
  return useQuery({ queryKey: MEU_PERFIL_KEY, queryFn: getMeuPerfil });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUsuarioInput) => createUsuario(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUsuarioInput }) => updateUsuario(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useDeactivateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUsuario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useSetStatusUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setStatusUsuario(id, ativo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useDeleteUsuarioPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUsuarioPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}
