import { ReservaDestinatarios } from '@prisma/client';

export interface DestinatariosReserva {
  solicitanteId: string;
  responsavelId: string | null;
  destinatariosNotificacao: ReservaDestinatarios;
}

/** Uma pessoa que ocupa os dois papéis recebe apenas um aviso. */
export function destinatariosReserva(reserva: DestinatariosReserva): string[] {
  const ids: string[] = [];
  if (reserva.destinatariosNotificacao !== ReservaDestinatarios.RESPONSAVEL) ids.push(reserva.solicitanteId);
  if (reserva.destinatariosNotificacao !== ReservaDestinatarios.SOLICITANTE && reserva.responsavelId) {
    ids.push(reserva.responsavelId);
  }
  return [...new Set(ids)];
}
