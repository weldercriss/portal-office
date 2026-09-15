import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroupRotinas, getRotinas, getUserOverrides, setGroupRotinas, setUserOverride } from '../api/permissoes.api';

const ROTINAS_KEY = ['permissoes', 'rotinas'] as const;

export function useRotinas() {
  return useQuery({ queryKey: ROTINAS_KEY, queryFn: getRotinas });
}

export function useGroupRotinas(groupId: string | null) {
  return useQuery({
    queryKey: ['permissoes', 'grupos', groupId] as const,
    queryFn: () => getGroupRotinas(groupId as string),
    enabled: !!groupId,
  });
}

export function useSetGroupRotinas(groupId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rotinas: string[]) => setGroupRotinas(groupId as string, rotinas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissoes', 'grupos', groupId] }),
  });
}

export function useUserOverrides(userId: string | null) {
  return useQuery({
    queryKey: ['permissoes', 'usuarios', userId] as const,
    queryFn: () => getUserOverrides(userId as string),
    enabled: !!userId,
  });
}

export function useSetUserOverride(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chave, concedida }: { chave: string; concedida: boolean | null }) =>
      setUserOverride(userId as string, chave, concedida),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissoes', 'usuarios', userId] }),
  });
}
