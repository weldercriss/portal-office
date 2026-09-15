import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adicionarGrupoConectado,
  getGruposConectados,
  getGruposDetectados,
  getTelegramConfig,
  getTelegramTipos,
  removerGrupoConectado,
  setTelegramTipoEnviar,
  testarEnvioTelegram,
  updateTelegramConfig,
} from '../api/telegram-config.api';
import type { AdicionarTelegramGrupoInput, UpdateTelegramConfigInput } from '../types/telegram-config.types';

const TELEGRAM_CONFIG_KEY = ['telegram-config'] as const;
const TELEGRAM_TIPOS_KEY = ['telegram-config', 'tipos'] as const;
const TELEGRAM_GRUPOS_KEY = ['telegram-config', 'grupos'] as const;
const TELEGRAM_GRUPOS_DETECTADOS_KEY = ['telegram-config', 'grupos-detectados'] as const;

export function useTelegramConfig() {
  return useQuery({ queryKey: TELEGRAM_CONFIG_KEY, queryFn: getTelegramConfig });
}

export function useUpdateTelegramConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTelegramConfigInput) => updateTelegramConfig(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TELEGRAM_CONFIG_KEY }),
  });
}

export function useTelegramTipos() {
  return useQuery({ queryKey: TELEGRAM_TIPOS_KEY, queryFn: getTelegramTipos });
}

export function useSetTelegramTipoEnviar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipo, ...campo }: { tipo: string; enviar?: boolean; enviarGrupo?: boolean }) =>
      setTelegramTipoEnviar(tipo, campo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TELEGRAM_TIPOS_KEY }),
  });
}

export function useGruposConectados() {
  return useQuery({ queryKey: TELEGRAM_GRUPOS_KEY, queryFn: getGruposConectados });
}

export function useAdicionarGrupoConectado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdicionarTelegramGrupoInput) => adicionarGrupoConectado(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TELEGRAM_GRUPOS_KEY }),
  });
}

export function useRemoverGrupoConectado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerGrupoConectado(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TELEGRAM_GRUPOS_KEY }),
  });
}

/** Grupos/tópicos que o bot já viu — só busca quando a tela de conexão do grupo está aberta. */
export function useGruposDetectados(habilitado: boolean) {
  return useQuery({
    queryKey: TELEGRAM_GRUPOS_DETECTADOS_KEY,
    queryFn: getGruposDetectados,
    enabled: habilitado,
    refetchInterval: habilitado ? 5000 : false,
  });
}

export function useTestarEnvioTelegram() {
  return useMutation({ mutationFn: () => testarEnvioTelegram() });
}
