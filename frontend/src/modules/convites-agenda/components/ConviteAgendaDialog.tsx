import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { SearchField } from '../../../components/system/SearchField';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { iniciarConexaoAgendaGoogle } from '../../usuarios/api/agenda-google.api';
import {
  useColaboradoresParaConvite,
  useCreateConviteAgenda,
  useOrganizadorStatus,
  useUpdateConviteAgenda,
  useVerificarConviteAgenda,
} from '../hooks/useConvitesAgenda';
import { RESPOSTA_CONVITE, STATUS_CONVITE_DESTINATARIO } from '../types/convite-agenda.types';
import type {
  ConviteAgenda,
  ConviteAgendaResposta,
  ConviteAgendaStatus,
  DisponibilidadeEmail,
} from '../types/convite-agenda.types';

interface ConviteAgendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente edita o convite; ausente cria um novo. */
  convite?: ConviteAgenda | null;
}

const MAX_DESTINATARIOS = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOM_STATUS_LEGADO: Record<ConviteAgendaStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CRIADO: 'success',
  INDISPONIVEL: 'neutral',
  FALHA: 'danger',
  CANCELADO: 'neutral',
};

const TOM_RESPOSTA: Record<ConviteAgendaResposta, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDENTE: 'neutral',
  ACEITO: 'success',
  RECUSADO: 'danger',
  TALVEZ: 'warning',
  DESCONHECIDO: 'neutral',
};

const TOM_DISPONIBILIDADE: Record<DisponibilidadeEmail['status'], 'success' | 'warning' | 'neutral'> = {
  LIVRE: 'success',
  OCUPADO: 'warning',
  DESCONHECIDO: 'neutral',
};

function formatarOcupado(intervalo: { inicio: string; fim: string }): string {
  const inicio = new Date(intervalo.inicio).toLocaleString('pt-BR');
  const fim = new Date(intervalo.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${inicio} – ${fim}`;
}

/** `<input type="datetime-local">` quer hora local, sem timezone. */
function paraDatetimeLocal(iso: string): string {
  const data = new Date(iso);
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

export function ConviteAgendaDialog({ open, onOpenChange, convite }: ConviteAgendaDialogProps) {
  const edicao = !!convite;
  const legado = convite?.modo === 'COPIAS_INDIVIDUAIS';
  const exigeOrganizador = !legado;

  const organizadorQuery = useOrganizadorStatus();
  const colaboradoresQuery = useColaboradoresParaConvite();
  const verificarMutation = useVerificarConviteAgenda();
  const createMutation = useCreateConviteAgenda();
  const updateMutation = useUpdateConviteAgenda();
  const conexaoMutation = useMutation({
    mutationFn: iniciarConexaoAgendaGoogle,
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [busca, setBusca] = useState('');
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<Set<string>>(new Set());
  const [emailsManuais, setEmailsManuais] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null);
  const [verificacao, setVerificacao] = useState<Record<string, DisponibilidadeEmail> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitulo(convite?.titulo ?? '');
    setLocal(convite?.local ?? '');
    setDescricao(convite?.descricao ?? '');
    setInicio(convite ? paraDatetimeLocal(convite.inicio) : '');
    setFim(convite ? paraDatetimeLocal(convite.fim) : '');
    setBusca('');
    setColaboradoresSelecionados(new Set());
    setEmailsManuais([]);
    setNovoEmail('');
    setAvisoEmail(null);
    setVerificacao(null);
    setErro(null);
  }, [open, convite]);

  const colaboradores = colaboradoresQuery.data ?? [];
  const colaboradoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return colaboradores;
    return colaboradores.filter((c) => c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo));
  }, [colaboradores, busca]);

  const emailsColaboradores = useMemo(
    () =>
      colaboradores.filter((c) => colaboradoresSelecionados.has(c.id)).map((c) => c.email.toLowerCase()),
    [colaboradores, colaboradoresSelecionados],
  );
  const emails = useMemo(
    () => [...new Set([...emailsColaboradores, ...emailsManuais])],
    [emailsColaboradores, emailsManuais],
  );

  const organizador = organizadorQuery.data;
  const organizadorApto = !exigeOrganizador || !!organizador?.conectado;

  function resetarVerificacao() {
    setVerificacao(null);
  }

  function alternarColaborador(id: string) {
    resetarVerificacao();
    setColaboradoresSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function adicionarEmail() {
    const email = novoEmail.trim().toLowerCase();
    setAvisoEmail(null);
    if (!email) return;
    if (!EMAIL_REGEX.test(email)) return setAvisoEmail('E-mail inválido.');
    if (organizador?.email && email === organizador.email.toLowerCase()) {
      return setAvisoEmail('Esse é o e-mail do organizador — os convites já saem dele.');
    }
    if (emails.includes(email)) return setAvisoEmail('Esse e-mail já está na lista.');
    if (emails.length >= MAX_DESTINATARIOS) return setAvisoEmail(`Limite de ${MAX_DESTINATARIOS} destinatários.`);

    resetarVerificacao();
    setEmailsManuais((atual) => [...atual, email]);
    setNovoEmail('');
  }

  function removerEmailManual(email: string) {
    resetarVerificacao();
    setEmailsManuais((atual) => atual.filter((item) => item !== email));
  }

  function handleTeclaEmail(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    adicionarEmail();
  }

  function mudarHorario(setter: (valor: string) => void, valor: string) {
    resetarVerificacao();
    setter(valor);
  }

  const intervaloValido = !!inicio && !!fim && new Date(inicio).getTime() < new Date(fim).getTime();
  const algumSelecionado = emails.length > 0;

  async function handleVerificar() {
    setErro(null);
    try {
      const resultado = await verificarMutation.mutateAsync({
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        destinatarioEmails: emails,
      });
      setVerificacao(Object.fromEntries(resultado.map((item) => [item.email, item])));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível checar a disponibilidade.');
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
          destinatarioEmails: emails,
        });
      }
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o convite.');
    }
  }

  const salvando = createMutation.isPending || updateMutation.isPending;
  const podeEnviar = edicao
    ? !!titulo.trim() && intervaloValido
    : !!titulo.trim() && intervaloValido && algumSelecionado && verificacao !== null && organizadorApto;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={edicao ? 'Editar convite de agenda' : 'Novo convite de agenda'}
      className="max-w-3xl"
      fitViewport
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {exigeOrganizador && !organizadorQuery.isLoading && (
          <div className="rounded-[var(--radius-field)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3 text-sm">
            {organizador?.conectado ? (
              <p className="text-[var(--color-text-secondary)]">
                Os convites sairão de <strong>{organizador.email}</strong>.
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[var(--color-text-secondary)]">
                  {organizador?.precisaReconectar
                    ? 'A autorização da sua Agenda Google não vale mais.'
                    : 'Conecte sua Agenda Google para enviar convites por e-mail.'}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => conexaoMutation.mutate()}
                  disabled={conexaoMutation.isPending || conexaoMutation.isSuccess}
                >
                  {organizador?.precisaReconectar ? 'Reconectar Agenda Google' : 'Conectar Agenda Google'}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <FormField label="Título" htmlFor="convite-titulo" className="sm:col-span-2">
            <Input
              id="convite-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Reunião geral"
              maxLength={120}
              required
            />
          </FormField>

          <FormField label="Início" htmlFor="convite-inicio">
            <Input
              id="convite-inicio"
              type="datetime-local"
              value={inicio}
              onChange={(e) => mudarHorario(setInicio, e.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Fim"
            htmlFor="convite-fim"
            error={inicio && fim && !intervaloValido ? 'Fim deve ser depois do início.' : undefined}
          >
            <Input
              id="convite-fim"
              type="datetime-local"
              value={fim}
              onChange={(e) => mudarHorario(setFim, e.target.value)}
              required
            />
          </FormField>

          <FormField label="Local (opcional)" htmlFor="convite-local">
            <Input id="convite-local" value={local} onChange={(e) => setLocal(e.target.value)} maxLength={200} />
          </FormField>

          <FormField label="Descrição (opcional)" htmlFor="convite-descricao">
            <Input id="convite-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} />
          </FormField>
        </div>

        {edicao ? (
          <FormField
            label="Destinatários"
            htmlFor="convite-destinatarios"
            hint="Não é possível adicionar ou remover destinatários de um convite já enviado."
          >
            <div
              id="convite-destinatarios"
              className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-[var(--radius-field)] border border-[var(--color-border)] p-2"
            >
              {convite!.destinatarios.map((destinatario) => (
                <div key={destinatario.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
                  <span className="flex-1 truncate">
                    {destinatario.nome ?? destinatario.user?.nome ?? destinatario.email}
                    {!destinatario.userId && <span className="ml-1 text-xs text-[var(--color-text-muted)]">({destinatario.email})</span>}
                  </span>
                  {!destinatario.userId && <Badge tone="neutral">Sem cadastro no portal</Badge>}
                  {legado ? (
                    <Badge tone={TOM_STATUS_LEGADO[destinatario.status ?? 'CANCELADO']} title={destinatario.erro ?? undefined}>
                      {STATUS_CONVITE_DESTINATARIO.find((opcao) => opcao.value === destinatario.status)?.label}
                    </Badge>
                  ) : (
                    <Badge tone={TOM_RESPOSTA[destinatario.resposta]}>
                      {RESPOSTA_CONVITE.find((opcao) => opcao.value === destinatario.resposta)?.label}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </FormField>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <FormField label={`Colaboradores (${emails.length}/${MAX_DESTINATARIOS})`} htmlFor="convite-colaboradores">
              <div className="flex flex-col gap-2">
                <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome ou e-mail" />
                {colaboradoresQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div
                    id="convite-colaboradores"
                    className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-[var(--radius-field)] border border-[var(--color-border)] p-2"
                  >
                    {colaboradoresFiltrados.map((colaborador) => {
                      const info = verificacao?.[colaborador.email.toLowerCase()];
                      return (
                        <label
                          key={colaborador.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--color-surface-hover)]"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0"
                            checked={colaboradoresSelecionados.has(colaborador.id)}
                            onChange={() => alternarColaborador(colaborador.id)}
                          />
                          <span className="flex-1 truncate">{colaborador.nome}</span>
                          {info && (
                            <Badge tone={TOM_DISPONIBILIDADE[info.status]} title={info.ocupado.map(formatarOcupado).join('; ')}>
                              {info.status === 'LIVRE' ? 'Livre' : info.status === 'OCUPADO' ? 'Já tem compromisso' : 'Agenda não consultável'}
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </FormField>

            <FormField
              label="Adicionar e-mail sem cadastro"
              htmlFor="convite-novo-email"
              hint="Enter ou o botão adiciona; o backend confirma domínio e limites ao enviar."
              error={avisoEmail ?? undefined}
            >
              <div className="flex gap-2">
                <Input
                  id="convite-novo-email"
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  onKeyDown={handleTeclaEmail}
                  placeholder="pessoa@empresa.com"
                />
                <Button type="button" variant="secondary" onClick={adicionarEmail}>
                  Adicionar
                </Button>
              </div>
              {emailsManuais.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {emailsManuais.map((email) => {
                    const info = verificacao?.[email];
                    return (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--color-surface-hover)] py-1 pl-2.5 pr-1.5 text-xs"
                      >
                        {email}
                        <Badge tone="neutral">Sem cadastro no portal</Badge>
                        {info && (
                          <Badge tone={TOM_DISPONIBILIDADE[info.status]} title={info.ocupado.map(formatarOcupado).join('; ')}>
                            {info.status === 'LIVRE' ? 'Livre' : info.status === 'OCUPADO' ? 'Ocupado' : 'Desconhecido'}
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => removerEmailManual(email)}
                          aria-label={`Remover ${email}`}
                          className="rounded-full px-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </FormField>
          </div>
        )}

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          {!edicao && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleVerificar}
              disabled={!intervaloValido || !algumSelecionado || !organizadorApto || verificarMutation.isPending}
            >
              {verificarMutation.isPending ? 'Checando...' : 'Verificar disponibilidade'}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!podeEnviar || salvando}
            title={!edicao && verificacao === null ? 'Verifique a disponibilidade antes de enviar' : undefined}
          >
            {salvando ? 'Salvando...' : edicao ? 'Salvar alterações' : 'Enviar convites'}
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
