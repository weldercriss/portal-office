import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../../config/env';
import { useAuth } from '../../../shared/auth/AuthContext';
import { invalidarAgenda } from './useAgendamento';

/**
 * Broadcast (não é por usuário, ver `AgendamentoGateway` no backend): qualquer
 * reserva criada, confirmada, cancelada ou editada por outra pessoa invalida
 * a lista e a grade de horários na hora, para dois admins olhando a mesma
 * tela não disputarem um horário que já ficou indisponível.
 */
export function useAgendamentoSocket() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(`${SOCKET_URL}/agendamento`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('reserva:mudou', () => invalidarAgenda(queryClient));

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
