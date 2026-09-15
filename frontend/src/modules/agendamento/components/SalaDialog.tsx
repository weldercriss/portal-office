import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { useCreateSala, useUpdateSala } from '../hooks/useAgendamento';
import type { Sala } from '../types/agendamento.types';
import { DisponibilidadeEditor, type JanelaEditavel } from './DisponibilidadeEditor';

interface SalaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente edita a sala; ausente cadastra uma nova. */
  sala?: Sala | null;
  /** Chamado com a sala salva, já com o diálogo fechado — útil para selecioná-la em seguida. */
  onSaved?: (sala: Sala) => void;
}

/**
 * Cadastro/edição de sala, extraído de `SalasAdminPage` para ser reaproveitado
 * também na tela de Agendamentos: quem está registrando uma reserva não
 * deveria precisar ir até Configurações só para criar a sala que falta.
 */
export function SalaDialog({ open, onOpenChange, sala, onSaved }: SalaDialogProps) {
  const createMutation = useCreateSala();
  const updateMutation = useUpdateSala();

  const [nome, setNome] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [janelas, setJanelas] = useState<JanelaEditavel[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Reabrir o diálogo recomeça do estado da sala em edição (ou em branco).
  useEffect(() => {
    if (!open) return;
    setNome(sala?.nome ?? '');
    setLocalizacao(sala?.localizacao ?? '');
    setCapacidade(sala?.capacidade ? String(sala.capacidade) : '');
    setObservacoes(sala?.observacoes ?? '');
    setJanelas(
      sala?.disponibilidades.map(({ diaSemana, horaInicio, horaFim, duracaoMinutos }) => ({
        diaSemana,
        horaInicio,
        horaFim,
        duracaoMinutos,
      })) ?? [],
    );
    setErro(null);
  }, [open, sala]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    // Campo esvaziado precisa chegar ao backend como vazio/nulo: `undefined`
    // significaria "não mexer" e o valor antigo continuaria lá.
    const input = {
      nome: nome.trim(),
      localizacao: localizacao.trim(),
      capacidade: capacidade ? Number(capacidade) : null,
      observacoes: observacoes.trim(),
      disponibilidades: janelas,
    };

    try {
      const salva = sala
        ? await updateMutation.mutateAsync({ id: sala.id, input })
        : await createMutation.mutateAsync(input);
      onOpenChange(false);
      onSaved?.(salva);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar a sala.');
    }
  }

  const salvando = createMutation.isPending || updateMutation.isPending;

  return (
    // Largo e em linha: a semana inteira precisa caber sem rolagem.
    <Dialog open={open} onOpenChange={onOpenChange} title={sala ? 'Editar sala' : 'Nova sala'} className="max-w-4xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField label="Nome" htmlFor="sala-nome" className="sm:col-span-2">
            <Input id="sala-nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} />
          </FormField>
          <FormField label="Local" htmlFor="sala-local">
            <Input
              id="sala-local"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="2º andar"
              maxLength={120}
            />
          </FormField>
          <FormField label="Capacidade" htmlFor="sala-capacidade">
            <Input
              id="sala-capacidade"
              type="number"
              min={1}
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              placeholder="8"
            />
          </FormField>
        </div>

        <FormField label="Observações" htmlFor="sala-observacoes">
          <Input
            id="sala-observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="TV, videoconferência..."
            maxLength={500}
          />
        </FormField>

        <DisponibilidadeEditor janelas={janelas} onChange={setJanelas} />

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
