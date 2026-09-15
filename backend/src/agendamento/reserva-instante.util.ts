/** Fuso dos horários HH:MM salvos na reserva (mesmo usado na Agenda Google). */
export function fuso(): string {
  return process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || 'America/Sao_Paulo';
}

/**
 * Instante real (UTC) de uma data+hora de parede num fuso horário. O Brasil
 * não observa mais horário de verão, então um único cálculo do deslocamento
 * já é exato — sem precisar de biblioteca de fuso horário.
 */
export function instanteWallClock(data: string, horaHHMM: string, timeZone: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [hora, minuto] = horaHHMM.split(':').map(Number);
  const comoUtc = Date.UTC(ano, mes - 1, dia, hora, minuto);

  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(comoUtc));
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const digitosLocaisComoUtc = Date.UTC(
    valor('year'),
    valor('month') - 1,
    valor('day'),
    valor('hour'),
    valor('minute'),
    valor('second'),
  );
  const deslocamentoMs = digitosLocaisComoUtc - comoUtc;
  return new Date(comoUtc - deslocamentoMs);
}

/** Dia (YYYY-MM-DD) de uma coluna `data`, que é sempre meia-noite UTC. */
function dia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export type EstadoTemporalReserva = 'FUTURA' | 'EM_ANDAMENTO' | 'FINALIZADA';

/**
 * Onde a reserva está na linha do tempo, pra decidir o que ainda pode mudar nela:
 * FUTURA ainda não começou (edita livre), EM_ANDAMENTO já começou mas não terminou
 * (só cancela) e FINALIZADA já passou do horário final (não mexe mais em nada).
 */
export function estadoTemporalReserva(reserva: { data: Date; horaInicio: string; horaFim: string }): EstadoTemporalReserva {
  const timeZone = fuso();
  const diaDaReserva = dia(reserva.data);
  const inicio = instanteWallClock(diaDaReserva, reserva.horaInicio, timeZone);
  const fim = instanteWallClock(diaDaReserva, reserva.horaFim, timeZone);
  const agora = Date.now();

  if (agora < inicio.getTime()) return 'FUTURA';
  if (agora < fim.getTime()) return 'EM_ANDAMENTO';
  return 'FINALIZADA';
}
