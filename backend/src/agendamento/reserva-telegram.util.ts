import { escaparTelegramHtml } from '../telegram/telegram-html.util';
import { ReservaDestinatarios } from '@prisma/client';

const EMOJI_TIPO: Record<string, string> = {
  RESERVA_SALA_SOLICITADA: '📝',
  RESERVA_SALA_CRIADA: '🗓️',
  RESERVA_SALA_CONFIRMADA: '✅',
  RESERVA_SALA_ATUALIZADA: '✏️',
  RESERVA_SALA_CANCELADA: '❌',
  RESERVA_SALA_LEMBRETE: '⏰',
  RESERVA_SALA_LEMBRETE_FIM: '⏳',
};

export function baseUrlPublica(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.CORS_ORIGIN ?? '').split(',')[0]?.trim() ?? '';
}

export function formatarDataBr(data: Date): string {
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export interface ReservaParaTexto {
  data: Date;
  horaInicio: string;
  horaFim: string;
  titulo: string | null;
  sala: { nome: string };
  solicitante: { nome: string; telegramUsername: string | null };
  responsavel?: { nome: string; telegramUsername: string | null } | null;
  destinatariosNotificacao?: ReservaDestinatarios;
}

/** Mensagem do aviso no grupo do Telegram: quem pediu, sala/horário e link pro portal. */
export function textoGrupoReserva(reserva: ReservaParaTexto, tipo: string, titulo: string): string {
  const emoji = EMOJI_TIPO[tipo] ?? '📌';
  const quem = reserva.destinatariosNotificacao !== ReservaDestinatarios.RESPONSAVEL && reserva.solicitante.telegramUsername
    ? `@${reserva.solicitante.telegramUsername.replace(/^@/, '')}`
    : reserva.solicitante.nome;

  const linhas = [
    `${emoji} <b>${escaparTelegramHtml(titulo)}</b>`,
    `Solicitado por: ${escaparTelegramHtml(quem)}`,
    `${escaparTelegramHtml(reserva.sala.nome)} — ${formatarDataBr(reserva.data)}, ${reserva.horaInicio} às ${reserva.horaFim}`,
  ];
  if (reserva.responsavel) {
    const responsavel = reserva.destinatariosNotificacao !== ReservaDestinatarios.SOLICITANTE && reserva.responsavel.telegramUsername
      ? `@${reserva.responsavel.telegramUsername.replace(/^@/, '')}`
      : reserva.responsavel.nome;
    linhas.splice(2, 0, `Responsável: ${escaparTelegramHtml(responsavel)}`);
  }
  if (reserva.titulo) linhas.push(escaparTelegramHtml(reserva.titulo));
  linhas.push('', `<a href="${baseUrlPublica()}/agendamentos">Ver Agendamento</a>`);
  return linhas.join('\n');
}
