import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions } from '../../../components/ui/Form';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useAuth } from '../../../shared/auth/AuthContext';
import { satisfazRole } from '../../../types/auth.types';
import { ConviteAgendaDialog } from '../components/ConviteAgendaDialog';
import {
  useCancelarConviteAgenda,
  useConvitesAgenda,
  useDeleteConviteAgenda,
  useReenviarConviteAgenda,
  useSincronizarRespostasConviteAgenda,
} from '../hooks/useConvitesAgenda';
import type { ConviteAgenda, ConviteAgendaEventoStatus, ConviteAgendaStatus } from '../types/convite-agenda.types';
import { RESPOSTA_CONVITE, STATUS_CONVITE_DESTINATARIO, STATUS_EVENTO_CONVITE } from '../types/convite-agenda.types';

const TOM_STATUS_LEGADO: Record<ConviteAgendaStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CRIADO: 'success',
  INDISPONIVEL: 'neutral',
  FALHA: 'danger',
  CANCELADO: 'neutral',
};

const TOM_STATUS_EVENTO: Record<ConviteAgendaEventoStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDENTE: 'warning',
  ENVIADO: 'success',
  FALHA: 'danger',
  CANCELADO: 'neutral',
};

const TOM_RESPOSTA: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDENTE: 'neutral',
  ACEITO: 'success',
  RECUSADO: 'danger',
  TALVEZ: 'warning',
  DESCONHECIDO: 'neutral',
};

function formatarPeriodo(inicio: string, fim: string): string {
  const dataInicio = new Date(inicio);
  const dataFim = new Date(fim);
  const dia = dataInicio.toLocaleDateString('pt-BR');
  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia}, ${horaInicio} às ${horaFim}`;
}

function resumoLegado(convite: ConviteAgenda) {
  const contagem = new Map<ConviteAgendaStatus, number>();
  for (const destinatario of convite.destinatarios) {
    if (!destinatario.status) continue;
    contagem.set(destinatario.status, (contagem.get(destinatario.status) ?? 0) + 1);
  }
  return contagem;
}

export default function ConvitesAgendaPage() {
  const { user } = useAuth();
  const ehMaster = satisfazRole(user?.role, 'MASTER');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ConviteAgenda | null>(null);
  const [detalhado, setDetalhado] = useState<ConviteAgenda | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [paraExcluir, setParaExcluir] = useState<ConviteAgenda | null>(null);

  const convitesQuery = useConvitesAgenda();
  const cancelarMutation = useCancelarConviteAgenda();
  const reenviarMutation = useReenviarConviteAgenda();
  const sincronizarMutation = useSincronizarRespostasConviteAgenda();
  const deleteMutation = useDeleteConviteAgenda();

  const convites = useMemo(() => convitesQuery.data ?? [], [convitesQuery.data]);

  function abrirNovo() {
    setEmEdicao(null);
    setDialogAberto(true);
  }

  function abrirEdicao(convite: ConviteAgenda) {
    setEmEdicao(convite);
    setDialogAberto(true);
  }

  function handleCancelar(id: string) {
    setErroAcao(null);
    cancelarMutation.mutate(id, {
      onSuccess: (atualizado) => setDetalhado((atual) => (atual?.id === id ? atualizado : atual)),
      onError: () => setErroAcao('Não foi possível cancelar os convites já enviados.'),
    });
  }

  function handleReenviar(id: string) {
    setErroAcao(null);
    reenviarMutation.mutate(id, {
      onSuccess: (atualizado) => setDetalhado((atual) => (atual?.id === id ? atualizado : atual)),
      onError: () => setErroAcao('Não foi possível tentar o envio novamente.'),
    });
  }

  function handleSincronizar(id: string) {
    setErroAcao(null);
    sincronizarMutation.mutate(id, {
      onSuccess: (atualizado) => setDetalhado((atual) => (atual?.id === id ? atualizado : atual)),
      onError: () => setErroAcao('Não foi possível atualizar as respostas.'),
    });
  }

  function confirmarExclusao() {
    if (!paraExcluir) return;
    deleteMutation.mutate(paraExcluir.id, {
      onSuccess: () => setParaExcluir(null),
      onError: () => setErroAcao('Não foi possível excluir o convite.'),
    });
  }

  return (
    <PageShell>
      <PageHeader
        title="Convites de agenda"
        description="Crie um evento e convide colaboradores ou e-mails externos — só você, como organizador, precisa conectar a Agenda Google."
        actions={<Button onClick={abrirNovo}>Novo convite</Button>}
      />

      {erroAcao && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroAcao}</p>}

      {convitesQuery.isError ? (
        <ErrorState message="Não foi possível carregar os convites." onRetry={() => convitesQuery.refetch()} />
      ) : convitesQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : convites.length === 0 ? (
        <EmptyState title="Nenhum convite enviado" description="Crie o primeiro convite em massa para colaboradores e e-mails externos." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Título</Th>
                <Th>Quando</Th>
                <Th>Organizador</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {convites.map((convite) => {
                const legado = convite.modo === 'COPIAS_INDIVIDUAIS';
                const contagem = legado ? resumoLegado(convite) : null;
                const temCriado = !!contagem && (contagem.get('CRIADO') ?? 0) > 0;
                const temPendenteLegado = !!contagem && ((contagem.get('FALHA') ?? 0) > 0 || (contagem.get('INDISPONIVEL') ?? 0) > 0);
                return (
                  <Tr key={convite.id}>
                    <Td className="font-bold text-[var(--color-text-primary)]">
                      <button type="button" className="text-left hover:underline" onClick={() => setDetalhado(convite)}>
                        {convite.titulo}
                      </button>
                      {legado && (
                        <Badge tone="neutral" className="ml-2">
                          Legado
                        </Badge>
                      )}
                    </Td>
                    <Td>{formatarPeriodo(convite.inicio, convite.fim)}</Td>
                    <Td>{legado ? convite.criadoPor.nome : (convite.organizadorEmail ?? convite.criadoPor.nome)}</Td>
                    <Td>
                      {legado ? (
                        <div className="flex flex-wrap gap-1">
                          {STATUS_CONVITE_DESTINATARIO.filter((opcao) => contagem?.get(opcao.value)).map((opcao) => (
                            <Badge key={opcao.value} tone={TOM_STATUS_LEGADO[opcao.value]}>
                              {contagem?.get(opcao.value)} {opcao.label.toLowerCase()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        convite.statusEvento && (
                          <Badge tone={TOM_STATUS_EVENTO[convite.statusEvento]}>
                            {STATUS_EVENTO_CONVITE.find((opcao) => opcao.value === convite.statusEvento)?.label}
                          </Badge>
                        )
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => abrirEdicao(convite)}
                          aria-label={`Editar ${convite.titulo}`}
                          title="Editar convite"
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        {legado ? (
                          <>
                            {temPendenteLegado && (
                              <Button variant="secondary" size="sm" disabled={reenviarMutation.isPending} onClick={() => handleReenviar(convite.id)}>
                                Reenviar pendentes
                              </Button>
                            )}
                            {temCriado && (
                              <Button variant="danger" size="sm" disabled={cancelarMutation.isPending} onClick={() => handleCancelar(convite.id)}>
                                Cancelar
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {convite.statusEvento === 'FALHA' && (
                              <Button variant="secondary" size="sm" disabled={reenviarMutation.isPending} onClick={() => handleReenviar(convite.id)}>
                                Tentar envio novamente
                              </Button>
                            )}
                            {convite.statusEvento === 'ENVIADO' && (
                              <Button variant="danger" size="sm" disabled={cancelarMutation.isPending} onClick={() => handleCancelar(convite.id)}>
                                Cancelar
                              </Button>
                            )}
                          </>
                        )}
                        {ehMaster && (
                          <Button variant="danger" size="sm" onClick={() => setParaExcluir(convite)}>
                            Excluir
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <ConviteAgendaDialog open={dialogAberto} onOpenChange={setDialogAberto} convite={emEdicao} />

      <Dialog
        open={!!detalhado}
        onOpenChange={(aberto) => !aberto && setDetalhado(null)}
        title={detalhado?.titulo ?? ''}
        className="max-w-lg"
      >
        {detalhado && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[var(--color-text-secondary)]">
              <p>{formatarPeriodo(detalhado.inicio, detalhado.fim)}</p>
              {detalhado.local && <p>Local: {detalhado.local}</p>}
              {detalhado.descricao && <p className="mt-1 whitespace-pre-wrap">{detalhado.descricao}</p>}
              {detalhado.modo === 'EVENTO_COM_CONVIDADOS' && detalhado.organizadorEmail && (
                <p className="mt-1">Organizador: {detalhado.organizadorEmail}</p>
              )}
            </div>

            {detalhado.modo === 'EVENTO_COM_CONVIDADOS' && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {detalhado.respostasSincronizadasEm
                    ? `Respostas atualizadas em ${new Date(detalhado.respostasSincronizadasEm).toLocaleString('pt-BR')}`
                    : 'Respostas ainda não foram sincronizadas.'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={detalhado.statusEvento !== 'ENVIADO' || sincronizarMutation.isPending}
                  onClick={() => handleSincronizar(detalhado.id)}
                >
                  {sincronizarMutation.isPending ? 'Atualizando...' : 'Atualizar respostas'}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {detalhado.destinatarios.map((destinatario) => (
                <div
                  key={destinatario.id}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-field)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <span className="truncate">{destinatario.nome ?? destinatario.user?.nome ?? destinatario.email}</span>
                  {detalhado.modo === 'COPIAS_INDIVIDUAIS' ? (
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
          </div>
        )}
      </Dialog>

      <Dialog open={!!paraExcluir} onOpenChange={(open) => !open && setParaExcluir(null)} title="Excluir convite">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente "{paraExcluir?.titulo}"? O registro some do portal — não dá para desfazer. Se o evento
            ainda estiver ativo na Agenda Google, cancele antes para os convidados não ficarem com um compromisso que o
            portal já esqueceu.
          </p>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setParaExcluir(null)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarExclusao} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </PageShell>
  );
}
