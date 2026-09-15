import { FormEvent, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  useColaboradoresParaConvite,
  useCreateConviteAgenda,
  useUpdateConviteAgenda,
  useVerificarConviteAgenda,
} from '../hooks/useConvitesAgenda';
import { STATUS_CONVITE_DESTINATARIO } from '../types/convite-agenda.types';
import type { ConviteAgenda, ConviteAgendaStatus, VerificacaoDestinatario } from '../types/convite-agenda.types';

interface ConviteAgendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente edita o convite; ausente cria um novo. */
  convite?: ConviteAgenda | null;
}

const TOM_STATUS: Record<ConviteAgendaStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CRIADO: 'success',
  INDISPONIVEL: 'neutral',
  FALHA: 'danger',
  CANCELADO: 'neutral',
};

function formatarConflito(conflito: { titulo: string; inicio: string | null; fim: string | null }): string {
  const inicio = conflito.inicio ? new Date(conflito.inicio).toLocaleString('pt-BR') : '';
  const fim = conflito.fim ? new Date(conflito.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  return inicio ? `${conflito.titulo} (${inicio}${fim ? ` – ${fim}` : ''})` : conflito.titulo;
}

/** `<input type="datetime-local">` quer hora local, sem timezone. */
function paraDatetimeLocal(iso: string): string {
  const data = new Date(iso);
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

export function ConviteAgendaDialog({ open, onOpenChange, convite }: ConviteAgendaDialogProps) {
  const edicao = !!convite;
  const colaboradoresQuery = useColaboradoresParaConvite();
  const verificarMutation = useVerificarConviteAgenda();
  const createMutation = useCreateConviteAgenda();
  const updateMutation = useUpdateConviteAgenda();

  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [verificacao, setVerificacao] = useState<Record<string, VerificacaoDestinatario> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitulo(convite?.titulo ?? '');
    setLocal(convite?.local ?? '');
    setDescricao(convite?.descricao ?? '');
    setInicio(convite ? paraDatetimeLocal(convite.inicio) : '');
    setFim(convite ? paraDatetimeLocal(convite.fim) : '');
    setSelecionados(
      convite
        ? new Set(convite.destinatarios.filter((d) => d.status !== 'CANCELADO').map((d) => d.userId))
        : new Set(),
    );
    setVerificacao(null);
    setErro(null);
  }, [open, convite]);

  const colaboradores = colaboradoresQuery.data ?? [];

  function alternar(id: string) {
    setVerificacao(null);
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function mudarHorario(setter: (valor: string) => void, valor: string) {
    setVerificacao(null);
    setter(valor);
  }

  const intervaloValido = !!inicio && !!fim && new Date(inicio).getTime() < new Date(fim).getTime();
  const algumSelecionado = selecionados.size > 0;

  async function handleVerificar() {
    setErro(null);
    try {
      const resultado = await verificarMutation.mutateAsync({
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        destinatarioIds: [...selecionados],
      });
      setVerificacao(Object.fromEntries(resultado.map((item) => [item.userId, item])));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível checar a agenda dos destinatários.');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    try {
      if (convite) {
        await updateMutation.mutateAsync({
          id: convite.id,
          input: {
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            local: local.trim(),
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
          },
        });
      } else {
        await createMutation.mutateAsync({
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          local: local.trim() || undefined,
          inicio: new Date(inicio).toISOString(),
          fim: new Date(fim).toISOString(),
          destinatarioIds: [...selecionados],
        });
      }
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o convite.');
    }
  }

  const salvando = createMutation.isPending || updateMutation.isPending;
  const podeEnviar = !!titulo.trim() && intervaloValido && algumSelecionado && verificacao !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={edicao ? 'Editar convite de agenda' : 'Novo convite de agenda'} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Título" htmlFor="convite-titulo">
          <Input
            id="convite-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Reunião geral"
            maxLength={120}
            required
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Início" htmlFor="convite-inicio">
            <Input
              id="convite-inicio"
              type="datetime-local"
              value={inicio}
              onChange={(e) => mudarHorario(setInicio, e.target.value)}
              required
            />
          </FormField>
          <FormField label="Fim" htmlFor="convite-fim">
            <Input
              id="convite-fim"
              type="datetime-local"
              value={fim}
              onChange={(e) => mudarHorario(setFim, e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label="Local (opcional)" htmlFor="convite-local">
          <Input id="convite-local" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={200} />
        </FormField>

        <FormField label="Descrição (opcional)" htmlFor="convite-descricao">
          <Input id="convite-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} />
        </FormField>

        <FormField
          label="Destinatários"
          htmlFor="convite-destinatarios"
          hint={edicao ? 'Não é possível adicionar ou remover destinatários de um convite já enviado.' : 'Só quem já conectou a Agenda Google pode receber o convite.'}
        >
          {colaboradoresQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div
              id="convite-destinatarios"
              className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-[var(--radius-field)] border border-[var(--color-border)] p-2"
            >
              {edicao
                ? convite!.destinatarios.map((destinatario) => {
                    const info = verificacao?.[destinatario.userId];
                    return (
                      <div key={destinatario.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
                        <span className="flex-1 truncate">{destinatario.user.nome}</span>
                        <Badge tone={TOM_STATUS[destinatario.status]}>
                          {STATUS_CONVITE_DESTINATARIO.find((opcao) => opcao.value === destinatario.status)?.label}
                        </Badge>
                        {info && !info.conflitos.length && <Badge tone="success">Livre no novo horário</Badge>}
                        {info && info.conflitos.length > 0 && (
                          <Badge tone="warning" title={info.conflitos.map(formatarConflito).join('; ')}>
                            Já tem compromisso
                          </Badge>
                        )}
                      </div>
                    );
                  })
                : colaboradores.map((colaborador) => {
                    const info = verificacao?.[colaborador.id];
                    return (
                      <label
                        key={colaborador.id}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${colaborador.disponivel ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]' : 'opacity-60'}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0"
                          disabled={!colaborador.disponivel}
                          checked={selecionados.has(colaborador.id)}
                          onChange={() => alternar(colaborador.id)}
                        />
                        <span className="flex-1 truncate">{colaborador.nome}</span>
                        {!colaborador.disponivel && <Badge tone="neutral">Indisponível</Badge>}
                        {info && !info.conflitos.length && <Badge tone="success">Livre</Badge>}
                        {info && info.conflitos.length > 0 && (
                          <Badge tone="warning" title={info.conflitos.map(formatarConflito).join('; ')}>
                            Já tem compromisso
                          </Badge>
                        )}
                      </label>
                    );
                  })}
            </div>
          )}
        </FormField>

        {verificacao && (
          <div className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
            {[...selecionados]
              .map((id) => verificacao[id])
              .filter((info) => info?.conflitos.length)
              .map((info) => {
                const nome = edicao
                  ? convite!.destinatarios.find((d) => d.userId === info.userId)?.user.nome
                  : colaboradores.find((c) => c.id === info.userId)?.nome;
                return (
                  <p key={info.userId} className="text-[var(--color-warning)]">
                    Divergência com {nome}: {info.conflitos.map(formatarConflito).join('; ')}
                  </p>
                );
              })}
          </div>
        )}

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleVerificar}
            disabled={!intervaloValido || !algumSelecionado || verificarMutation.isPending}
          >
            {verificarMutation.isPending ? 'Checando...' : 'Verificar disponibilidade'}
          </Button>
          <Button type="submit" disabled={!podeEnviar || salvando} title={verificacao === null ? 'Verifique a disponibilidade antes de salvar' : undefined}>
            {salvando ? 'Salvando...' : edicao ? 'Salvar alterações' : 'Enviar convites'}
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
