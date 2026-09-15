import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Select } from '../../../components/ui/Select';
import type { Disponibilidade } from '../types/agendamento.types';
import { DIAS_SEMANA } from '../types/agendamento.types';

export type JanelaEditavel = Omit<Disponibilidade, 'id'>;

interface DisponibilidadeEditorProps {
  janelas: JanelaEditavel[];
  onChange: (janelas: JanelaEditavel[]) => void;
}

const JANELA_PADRAO: JanelaEditavel = { diaSemana: 1, horaInicio: '09:00', horaFim: '18:00', duracaoMinutos: 60 };

/** Passo da grade de blocos — não é o tamanho da reserva, que é livre. */
const BLOCOS = [15, 30, 60, 120, 180, 240];

const nomeDoDia = (diaSemana: number) => DIAS_SEMANA.find((dia) => dia.value === diaSemana)?.label ?? '';

/**
 * Grade semanal de quando a sala abre. Uma linha por janela, com os rótulos
 * escritos uma vez só no cabeçalho: assim a semana inteira cabe na tela sem
 * rolagem. `Blocos de` é só o passo dos atalhos na hora de reservar — a reserva
 * em si pode ter quantas horas couberem na janela.
 */
export function DisponibilidadeEditor({ janelas, onChange }: DisponibilidadeEditorProps) {
  function alterar(indice: number, mudanca: Partial<JanelaEditavel>) {
    onChange(janelas.map((janela, i) => (i === indice ? { ...janela, ...mudanca } : janela)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>Dias e horários disponíveis</Label>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...janelas, JANELA_PADRAO])}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Adicionar janela
        </Button>
      </div>

      {janelas.length === 0 ? (
        <p className="rounded-card border border-dashed border-[var(--color-border-strong)] p-3 text-center text-sm text-[var(--color-text-muted)]">
          Sem janelas cadastradas, a sala não aceita reservas.
        </p>
      ) : (
        <div className="rounded-card border border-[var(--color-border)] p-3">
          <div className="grid grid-cols-[minmax(7rem,1fr)_6.5rem_6.5rem_minmax(6rem,1fr)_2.5rem] items-center gap-x-3 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Dia</span>
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Abre</span>
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Fecha</span>
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Blocos de</span>
            <span className="sr-only">Ações</span>
          </div>

          <ul className="flex flex-col gap-1.5">
            {janelas.map((janela, indice) => (
              <li
                key={indice}
                className="grid grid-cols-[minmax(7rem,1fr)_6.5rem_6.5rem_minmax(6rem,1fr)_2.5rem] items-center gap-x-3"
              >
                <Select
                  aria-label={`Dia da janela ${indice + 1}`}
                  value={janela.diaSemana}
                  onChange={(e) => alterar(indice, { diaSemana: Number(e.target.value) })}
                >
                  {DIAS_SEMANA.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </Select>

                <Input
                  aria-label={`Abre em ${nomeDoDia(janela.diaSemana)}`}
                  type="time"
                  value={janela.horaInicio}
                  onChange={(e) => alterar(indice, { horaInicio: e.target.value })}
                  required
                />

                <Input
                  aria-label={`Fecha em ${nomeDoDia(janela.diaSemana)}`}
                  type="time"
                  value={janela.horaFim}
                  onChange={(e) => alterar(indice, { horaFim: e.target.value })}
                  required
                />

                <Select
                  aria-label={`Blocos de ${nomeDoDia(janela.diaSemana)}`}
                  value={janela.duracaoMinutos}
                  onChange={(e) => alterar(indice, { duracaoMinutos: Number(e.target.value) })}
                >
                  {BLOCOS.map((minutos) => (
                    <option key={minutos} value={minutos}>
                      {minutos >= 60 ? `${minutos / 60}h` : `${minutos} min`}
                    </option>
                  ))}
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-[var(--color-danger)]"
                  onClick={() => onChange(janelas.filter((_, i) => i !== indice))}
                  aria-label={`Remover janela de ${nomeDoDia(janela.diaSemana)}`}
                  title="Remover janela"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <p className="pt-2 text-xs text-[var(--color-text-muted)]">
            Os blocos são só atalhos na hora de reservar: a reserva pode ter quantas horas couberem na janela do dia.
          </p>
        </div>
      )}
    </div>
  );
}
