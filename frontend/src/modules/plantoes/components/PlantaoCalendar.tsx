import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { Plantao } from '../types/plantao.types';

interface PlantaoCalendarProps {
  plantoes: Plantao[];
  month: Date;
  onRequestSwap?: (plantao: Plantao) => void;
  currentUserId?: string;
  onMonthChange: (month: Date) => void;
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function monthRange(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: dateKey(first), to: dateKey(last) };
}

export function PlantaoCalendar({
  plantoes,
  month,
  onRequestSwap,
  currentUserId,
  onMonthChange,
}: PlantaoCalendarProps) {
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const cells: Array<Date | null> = Array(first.getDay()).fill(null);
    for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const byDate = useMemo(() => {
    const grouped = new Map<string, Plantao[]>();
    for (const plantao of plantoes) {
      const key = plantao.data.slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), plantao]);
    }
    return grouped;
  }, [plantoes]);

  function moveMonth(amount: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  const today = dateKey(new Date());

  return (
    <section className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-elegant">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" size="sm" className="px-2" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[170px] text-center font-bricolage text-xl font-bold tracking-[-0.3px] text-[var(--color-text-primary)]">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </h2>
          <Button type="button" variant="secondary" size="sm" className="px-2" onClick={() => moveMonth(1)} aria-label="Próximo mês">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onMonthChange(new Date())}>
          Hoje
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = day ? dateKey(day) : `empty-${index}`;
          const items = day ? byDate.get(key) ?? [] : [];
          return (
            <div key={key} className="min-h-[116px] border-b border-r border-[var(--color-border)] p-2 last:border-r-0 sm:min-h-[135px]">
              {day && (
                <>
                  <span
                    className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      key === today
                        ? 'bg-[var(--color-accent)] text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {items.map((plantao) => {
                      const ehMeu = plantao.userId === currentUserId;
                      return (
                        <div
                          key={plantao.id}
                          className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-xs"
                        >
                          <p className="truncate font-bold text-[var(--color-text-primary)]">{plantao.nome ?? 'Plantão'}</p>
                          <p className="truncate text-[var(--color-text-secondary)]">{plantao.user?.nome ?? 'Sem atendente'}</p>
                          {plantao.tipoPlantao && (
                            <p className="truncate text-[var(--color-text-muted)]">
                              {plantao.tipoPlantao.nome} · {plantao.tipoPlantao.horaInicio}-{plantao.tipoPlantao.horaFim}
                            </p>
                          )}
                          {ehMeu && plantao.status === 'PUBLICADO' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-1 h-7 px-1.5 text-xs"
                              onClick={() => onRequestSwap?.(plantao)}
                            >
                              Trocar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
