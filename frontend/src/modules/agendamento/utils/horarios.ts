import type { Disponibilidade, HorarioDisponivel } from '../types/agendamento.types';

/**
 * Espelho das regras de horário do backend, para a tela responder na hora em
 * vez de esperar a recusa do servidor. O servidor continua sendo a autoridade.
 */

export interface Intervalo {
  horaInicio: string;
  horaFim: string;
}

/** `HH:MM` → minutos desde a meia-noite. Vazio ou inválido vira `null`. */
export function emMinutos(hora: string): number | null {
  const casado = hora.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return casado ? Number(casado[1]) * 60 + Number(casado[2]) : null;
}

export function emHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Duração em minutos, ou `null` se o intervalo ainda não estiver completo. */
export function duracaoEmMinutos(intervalo: Intervalo): number | null {
  const inicio = emMinutos(intervalo.horaInicio);
  const fim = emMinutos(intervalo.horaFim);
  if (inicio === null || fim === null) return null;
  return fim - inicio;
}

/** "2h30" — como a duração aparece para quem está preenchendo. */
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

/** Intervalos meio-abertos: encostar não é conflito. */
export function seSobrepoe(a: Intervalo, b: Intervalo): boolean {
  const [aInicio, aFim, bInicio, bFim] = [a.horaInicio, a.horaFim, b.horaInicio, b.horaFim].map(emMinutos);
  if (aInicio === null || aFim === null || bInicio === null || bFim === null) return false;
  return aInicio < bFim && bInicio < aFim;
}

/** 0 = domingo, em UTC, igual ao backend. */
export function diaSemanaDe(data: string): number {
  return new Date(`${data}T00:00:00.000Z`).getUTCDay();
}

/** A janela comercial da sala naquele dia da semana que comporta o intervalo. */
export function janelaQueComporta(
  disponibilidades: Disponibilidade[],
  data: string,
  intervalo: Intervalo,
): Disponibilidade | undefined {
  const dia = diaSemanaDe(data);
  const inicio = emMinutos(intervalo.horaInicio);
  const fim = emMinutos(intervalo.horaFim);
  if (inicio === null || fim === null) return undefined;

  return disponibilidades.find((janela) => {
    const abre = emMinutos(janela.horaInicio);
    const fecha = emMinutos(janela.horaFim);
    return janela.diaSemana === dia && abre !== null && fecha !== null && abre <= inicio && fim <= fecha;
  });
}

/** Faixa que a sala abre no dia, para orientar quem digita o horário à mão. */
export function janelasDoDia(disponibilidades: Disponibilidade[], data: string): Disponibilidade[] {
  const dia = diaSemanaDe(data);
  return disponibilidades
    .filter((janela) => janela.diaSemana === dia)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}

/** Um horário cujo início já chegou (hoje) ou já passou (dia anterior) não pode mais ser reservado. */
export function blocoJaPassou(data: string, horaInicio: string): boolean {
  const [ano, mes, dia] = data.slice(0, 10).split('-').map(Number);
  const [hora, minuto] = horaInicio.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto).getTime() <= Date.now();
}

/**
 * Por que o intervalo escolhido não serve, ou `null` se estiver tudo certo.
 * A pessoa pode pedir quantas horas quiser, desde que caibam numa janela da
 * sala e não encostem em reserva já feita.
 */
export function motivoInvalido(
  intervalo: Intervalo,
  data: string,
  disponibilidades: Disponibilidade[],
  horarios: HorarioDisponivel[],
): string | null {
  const inicio = emMinutos(intervalo.horaInicio);
  const fim = emMinutos(intervalo.horaFim);
  if (inicio === null || fim === null) return 'Informe o horário inicial e o final.';
  if (fim <= inicio) return 'O horário final precisa ser depois do inicial.';
  if (blocoJaPassou(data, intervalo.horaInicio)) return 'Esse horário já passou.';

  const janelas = janelasDoDia(disponibilidades, data);
  if (janelas.length === 0) return 'A sala não abre nesse dia da semana.';

  if (!janelaQueComporta(disponibilidades, data, intervalo)) {
    const faixas = janelas.map((janela) => `${janela.horaInicio} às ${janela.horaFim}`).join(' ou ');
    return `Nesse dia a sala abre das ${faixas}.`;
  }

  const ocupado = horarios.filter((horario) => !horario.disponivel).find((horario) => seSobrepoe(horario, intervalo));
  if (ocupado) return `Já existe reserva entre ${ocupado.horaInicio} e ${ocupado.horaFim}.`;

  return null;
}

export type EstadoTemporalReserva = 'FUTURA' | 'EM_ANDAMENTO' | 'FINALIZADA';

/**
 * Onde a reserva está na linha do tempo, assumindo o fuso de quem está vendo a
 * tela (equipe toda no Brasil, igual ao resto do calendário deste módulo).
 * Espelha `estadoTemporalReserva` do backend — que é quem realmente decide.
 */
export function estadoTemporalReserva(reserva: { data: string; horaInicio: string; horaFim: string }): EstadoTemporalReserva {
  const [ano, mes, dia] = reserva.data.slice(0, 10).split('-').map(Number);
  const instante = (hora: string) => {
    const [h, m] = hora.split(':').map(Number);
    return new Date(ano, mes - 1, dia, h, m).getTime();
  };

  const agora = Date.now();
  const inicio = instante(reserva.horaInicio);
  const fim = instante(reserva.horaFim);
  if (agora < inicio) return 'FUTURA';
  if (agora < fim) return 'EM_ANDAMENTO';
  return 'FINALIZADA';
}
