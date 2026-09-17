import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelarConviteAgenda,
  createConviteAgenda,
  getColaboradoresParaConvite,
  getConviteAgenda,
  getConvitesAgenda,
  getOrganizadorStatus,
  reenviarConviteAgenda,
  sincronizarRespostasConviteAgenda,
  updateConviteAgenda,
  verificarConviteAgenda,
} from '../api/convites-agenda.api';
import type {
  CreateConviteAgendaInput,
  UpdateConviteAgendaInput,
  VerificarConviteAgendaInput,
} from '../types/convite-agenda.types';

const CONVITES_KEY = ['convites-agenda'] as const;
const COLABORADORES_KEY = ['convites-agenda', 'colaboradores'] as const;
const ORGANIZADOR_KEY = ['convites-agenda', 'organizador'] as const;

export function useColaboradoresParaConvite() {
  return useQuery({ queryKey: COLABORADORES_KEY, queryFn: getColaboradoresParaConvite });
}

export function useOrganizadorStatus() {
  return useQuery({ queryKey: ORGANIZADOR_KEY, queryFn: getOrganizadorStatus });
}

export function useConvitesAgenda() {
  return useQuery({ queryKey: CONVITES_KEY, queryFn: getConvitesAgenda });
}

export function useConviteAgenda(id: string | undefined) {
  return useQuery({
    queryKey: [...CONVITES_KEY, id],
    queryFn: () => getConviteAgenda(id as string),
    enabled: !!id,
  });
}

/** Sem cache: cada chamada reflete o instante em que o admin pediu a checagem. */
export function useVerificarConviteAgenda() {
  return useMutation({ mutationFn: (input: VerificarConviteAgendaInput) => verificarConviteAgenda(input) });
}

export function useCreateConviteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConviteAgendaInput) => createConviteAgenda(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVITES_KEY }),
  });
}

export function useUpdateConviteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConviteAgendaInput }) => updateConviteAgenda(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVITES_KEY }),
  });
}

export function useReenviarConviteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reenviarConviteAgenda(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVITES_KEY }),
  });
}

export function useCancelarConviteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarConviteAgenda(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVITES_KEY }),
  });
}

export function useSincronizarRespostasConviteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sincronizarRespostasConviteAgenda(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVITES_KEY }),
  });
}
