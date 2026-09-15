import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../../config/env';
import { useAuth } from '../../../shared/auth/AuthContext';
import { CONTAGEM_NAO_LIDAS_KEY, NOTIFICACOES_KEY } from './useNotificacoes';
import type { Notificacao } from '../types/notificacao.types';

export function useNotificacoesSocket() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(`${SOCKET_URL}/notificacoes`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('notificacao:nova', (notificacao: Notificacao) => {
      queryClient.setQueryData<Notificacao[]>(NOTIFICACOES_KEY, (atual) => [notificacao, ...(atual ?? [])]);
      queryClient.setQueryData<{ total: number }>(CONTAGEM_NAO_LIDAS_KEY, (atual) => ({
        total: (atual?.total ?? 0) + 1,
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
