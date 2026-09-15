import { cn } from '../../../lib/cn';
import type { HorarioDisponivel } from '../types/agendamento.types';
import { blocoJaPassou, seSobrepoe } from '../utils/horarios';

export interface IntervaloSelecionado {
  horaInicio: string;
  horaFim: string;
}

interface GradeHorariosProps {
  /** Dia a que os horários pertencem, pra saber quais blocos já passaram. */
  data: string;
  horarios: HorarioDisponivel[];
  /** Ausente deixa a grade só de leitura, como panorama do dia. */
  onSelecionar?: (intervalo: IntervaloSelecionado) => void;
  selecionado?: IntervaloSelecionado | null;
}

/**
 * Blocos que a sala oferece no dia. A reserva não fica presa a um bloco: eles
 * são atalho e mapa do que já foi tomado, enquanto o horário exato pode ser
 * digitado. Clicar num bloco livre seleciona; clicar num posterior estende até
 * ele, desde que todo o trecho no meio continue livre — e ainda não tenha passado.
 */
export function GradeHorarios({ data, horarios, onSelecionar, selecionado }: GradeHorariosProps) {
  function handleClique(indice: number) {
    if (!onSelecionar) return;
    const horario = horarios[indice];

    if (selecionado && horario.horaInicio > selecionado.horaInicio) {
      const inicio = horarios.findIndex((h) => h.horaInicio === selecionado.horaInicio);
      if (inicio >= 0) {
        const trecho = horarios.slice(inicio, indice + 1);
        const contiguo = trecho.every((h, i) => i === 0 || h.horaInicio === trecho[i - 1].horaFim);
        if (contiguo && trecho.every((h) => h.disponivel && !blocoJaPassou(data, h.horaInicio))) {
          onSelecionar({ horaInicio: selecionado.horaInicio, horaFim: horario.horaFim });
          return;
        }
      }
    }

    onSelecionar({ horaInicio: horario.horaInicio, horaFim: horario.horaFim });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {horarios.map((horario, indice) => {
        // Sobreposição, e não contenção: um horário digitado à mão (09:30–10:30)
        // também precisa acender os blocos que ele atravessa.
        const ativo = !!selecionado && seSobrepoe(horario, selecionado);
        const passou = blocoJaPassou(data, horario.horaInicio);
        const bloqueado = (!horario.disponivel || passou) && !ativo;

        return (
          <button
            key={horario.horaInicio}
            type="button"
            disabled={bloqueado || !onSelecionar}
            onClick={() => handleClique(indice)}
            aria-pressed={onSelecionar ? ativo : undefined}
            title={
              bloqueado
                ? !horario.disponivel
                  ? 'Horário já reservado'
                  : 'Horário já passou'
                : `${horario.horaInicio} às ${horario.horaFim}`
            }
            className={cn(
              'rounded-[var(--radius-button)] border px-2.5 py-1 text-[13px] font-bold transition-colors',
              ativo
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-primary)]'
                : bloqueado
                  ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] line-through'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]',
              !bloqueado && onSelecionar && !ativo && 'hover:border-[var(--color-border-focus)]',
              !onSelecionar && !bloqueado && 'cursor-default',
            )}
          >
            {horario.horaInicio}–{horario.horaFim}
          </button>
        );
      })}
    </div>
  );
}
