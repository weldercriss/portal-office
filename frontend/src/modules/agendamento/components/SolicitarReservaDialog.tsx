import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { useCreateMinhaReserva, useHorarios } from '../hooks/useAgendamento';
import type { Sala } from '../types/agendamento.types';
import { duracaoEmMinutos, formatarDuracao, janelasDoDia, motivoInvalido } from '../utils/horarios';
import { GradeHorarios, type IntervaloSelecionado } from './GradeHorarios';

interface SolicitarReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salas: Sala[];
  dataPadrao: string;
  salaPadrao?: string;
}

export function SolicitarReservaDialog({
  open,
  onOpenChange,
  salas,
  dataPadrao,
  salaPadrao,
}: SolicitarReservaDialogProps) {
  const createMutation = useCreateMinhaReserva();
  const [salaId, setSalaId] = useState('');
  const [data, setData] = useState(dataPadrao);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [notificarTelegram, setNotificarTelegram] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSalaId(salaPadrao ?? '');
    setData(dataPadrao);
    setHoraInicio('');
    setHoraFim('');
    setTitulo('');
    setObservacoes('');
    setNotificarTelegram(true);
    setErro(null);
  }, [open, dataPadrao, salaPadrao]);

  const horariosQuery = useHorarios(salaId || undefined, data || undefined);
  const horarios = horariosQuery.data ?? [];
  const salaSelecionada = salas.find((sala) => sala.id === salaId);
  const disponibilidades = salaSelecionada?.disponibilidades ?? [];
  const intervalo: IntervaloSelecionado | null = horaInicio && horaFim ? { horaInicio, horaFim } : null;
  const duracao = intervalo && duracaoEmMinutos(intervalo);
  const problema = intervalo && salaId && data ? motivoInvalido(intervalo, data, disponibilidades, horarios) : null;
  const janelas = salaId && data ? janelasDoDia(disponibilidades, data) : [];

  function selecionarBloco(bloco: IntervaloSelecionado) {
    setHoraInicio(bloco.horaInicio);
    setHoraFim(bloco.horaFim);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!intervalo) {
      setErro('Informe o horário inicial e o final.');
      return;
    }
    if (problema) {
      setErro(problema);
      return;
    }

    try {
      await createMutation.mutateAsync({
        salaId,
        data,
        horaInicio,
        horaFim,
        titulo: titulo.trim(),
        observacoes: observacoes.trim(),
        notificarTelegram,
      });
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível solicitar a reserva.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Solicitar reserva de sala" className="max-w-4xl" fitViewport>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Sala" htmlFor="solicitacao-reserva-sala">
            <Select id="solicitacao-reserva-sala" value={salaId} onChange={(e) => setSalaId(e.target.value)} required>
              <option value="">Selecione a sala</option>
              {salas.map((sala) => (
                <option key={sala.id} value={sala.id}>{sala.nome}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data" htmlFor="solicitacao-reserva-data">
            <Input id="solicitacao-reserva-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </FormField>
          <FormField label="Assunto" htmlFor="solicitacao-reserva-titulo">
            <Input
              id="solicitacao-reserva-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Reunião de planejamento"
              maxLength={120}
            />
          </FormField>
        </div>

        <div className="rounded-card border border-[var(--color-border)] p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="solicitacao-reserva-inicio">Início</Label>
              <Input id="solicitacao-reserva-inicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <Label htmlFor="solicitacao-reserva-fim">Fim</Label>
              <Input id="solicitacao-reserva-fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required />
            </div>
            <p className="flex-1 pb-2.5 text-xs text-[var(--color-text-muted)]">
              {duracao && duracao > 0 ? <span className="font-bold text-[var(--color-text-secondary)]">Duração: {formatarDuracao(duracao)}. </span> : null}
              {janelas.length > 0
                ? `A sala abre das ${janelas.map((janela) => `${janela.horaInicio} às ${janela.horaFim}`).join(' e das ')}.`
                : 'Escolha a sala e a data para ver os horários.'}
            </p>
          </div>
          <div className="mt-4">
            {!salaId || !data ? null : horariosQuery.isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : horariosQuery.isError ? (
              <p className="text-sm text-[var(--color-danger)]">Não foi possível carregar os horários.</p>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Esta sala não abre nesse dia da semana.</p>
            ) : (
              <GradeHorarios data={data} horarios={horarios} selecionado={intervalo} onSelecionar={selecionarBloco} />
            )}
          </div>
          {problema && <p className="mt-3 text-xs text-[var(--color-danger)]">{problema}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <FormField label="Observações" htmlFor="solicitacao-reserva-observacoes">
            <Input id="solicitacao-reserva-observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
          </FormField>
          <StatusToggle checked={notificarTelegram} onChange={setNotificarTelegram} label="Notificar por Telegram" />
        </div>

        <div className="flex items-center gap-3 rounded-card bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          <Badge tone="warning">Solicitada</Badge>
          O horário fica reservado enquanto um administrador analisa o pedido.
        </div>

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>Voltar</Button>
          <Button type="submit" disabled={createMutation.isPending || !!problema}>
            {createMutation.isPending ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
