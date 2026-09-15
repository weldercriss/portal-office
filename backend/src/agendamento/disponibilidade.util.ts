/**
 * Regras de horário do agendamento de salas. Tudo aqui é função pura sobre
 * `HH:MM` e datas `YYYY-MM-DD` — sem fuso e sem banco, para que a mesma conta
 * valha no serviço, nos testes e (no futuro) em outro projeto.
 */

export interface JanelaDisponibilidade {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
}

export interface IntervaloOcupado {
  horaInicio: string;
  horaFim: string;
}

export interface HorarioDisponivel {
  horaInicio: string;
  horaFim: string;
  disponivel: boolean;
}

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function horaValida(valor: string): boolean {
  return HORA.test(valor);
}

/** `HH:MM` → minutos desde a meia-noite. Presume `horaValida`. */
export function emMinutos(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

export function emHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Dia da semana (0 = domingo) de uma data `YYYY-MM-DD`, sempre em UTC — o mesmo
 * critério que o resto do portal usa para não deslocar o dia em ±1 fora de UTC.
 */
export function diaSemanaDe(data: string): number {
  return new Date(`${data}T00:00:00.000Z`).getUTCDay();
}

export function dataUtc(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

export function duracaoEmMinutos(intervalo: IntervaloOcupado): number {
  return emMinutos(intervalo.horaFim) - emMinutos(intervalo.horaInicio);
}

/** Sobreposição de intervalos meio-abertos: encostar não é conflito. */
export function seSobrepoe(a: IntervaloOcupado, b: IntervaloOcupado): boolean {
  return emMinutos(a.horaInicio) < emMinutos(b.horaFim) && emMinutos(b.horaInicio) < emMinutos(a.horaFim);
}

/** As janelas de um mesmo dia da semana não podem se sobrepor. */
export function janelasConflitantes(janelas: JanelaDisponibilidade[]): boolean {
  const porDia = new Map<number, JanelaDisponibilidade[]>();
  for (const janela of janelas) {
    const doDia = porDia.get(janela.diaSemana) ?? [];
    if (doDia.some((outra) => seSobrepoe(outra, janela))) return true;
    doDia.push(janela);
    porDia.set(janela.diaSemana, doDia);
  }
  return false;
}

/**
 * Fatia as janelas do dia nos horários oferecidos e marca como indisponível
 * todo horário que encosta numa reserva viva. Sobra de janela menor que a
 * duração é descartada: um horário só é oferecido inteiro.
 */
export function horariosDoDia(
  janelas: JanelaDisponibilidade[],
  data: string,
  ocupados: IntervaloOcupado[],
): HorarioDisponivel[] {
  const dia = diaSemanaDe(data);
  const horarios: HorarioDisponivel[] = [];

  for (const janela of janelas.filter((j) => j.diaSemana === dia)) {
    const fim = emMinutos(janela.horaFim);
    const passo = Math.max(1, janela.duracaoMinutos);
    for (let inicio = emMinutos(janela.horaInicio); inicio + passo <= fim; inicio += passo) {
      const horario = { horaInicio: emHora(inicio), horaFim: emHora(inicio + passo) };
      horarios.push({ ...horario, disponivel: !ocupados.some((ocupado) => seSobrepoe(horario, ocupado)) });
    }
  }

  return horarios.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}

/** O horário pedido precisa caber inteiro dentro de uma janela do dia. */
export function dentroDaDisponibilidade(
  janelas: JanelaDisponibilidade[],
  data: string,
  intervalo: IntervaloOcupado,
): boolean {
  const dia = diaSemanaDe(data);
  const inicio = emMinutos(intervalo.horaInicio);
  const fim = emMinutos(intervalo.horaFim);
  return janelas.some(
    (janela) =>
      janela.diaSemana === dia && emMinutos(janela.horaInicio) <= inicio && fim <= emMinutos(janela.horaFim),
  );
}
