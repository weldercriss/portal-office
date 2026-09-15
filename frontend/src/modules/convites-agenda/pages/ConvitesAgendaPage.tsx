import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { ConviteAgendaDialog } from '../components/ConviteAgendaDialog';
import { useCancelarConviteAgenda, useConvitesAgenda, useReenviarConviteAgenda } from '../hooks/useConvitesAgenda';
import type { ConviteAgenda, ConviteAgendaStatus } from '../types/convite-agenda.types';
import { STATUS_CONVITE_DESTINATARIO } from '../types/convite-agenda.types';

const TOM_STATUS: Record<ConviteAgendaStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CRIADO: 'success',
  INDISPONIVEL: 'neutral',
  FALHA: 'danger',
  CANCELADO: 'neutral',
};

function formatarPeriodo(inicio: string, fim: string): string {
  const dataInicio = new Date(inicio);
  const dataFim = new Date(fim);
  const dia = dataInicio.toLocaleDateString('pt-BR');
  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia}, ${horaInicio} às ${horaFim}`;
}

function resumo(convite: ConviteAgenda) {
  const contagem = new Map<ConviteAgendaStatus, number>();
  for (const destinatario of convite.destinatarios) {
    contagem.set(destinatario.status, (contagem.get(destinatario.status) ?? 0) + 1);
  }
  return contagem;
}

export default function ConvitesAgendaPage() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ConviteAgenda | null>(null);
  const [detalhado, setDetalhado] = useState<ConviteAgenda | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const convitesQuery = useConvitesAgenda();
  const cancelarMutation = useCancelarConviteAgenda();
  const reenviarMutation = useReenviarConviteAgenda();

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
      onError: () => setErroAcao('Não foi possível reenviar para quem ainda está pendente.'),
    });
  }

  return (
    <PageShell>
      <PageHeader
        title="Convites de agenda"
        description="Crie um evento e envie de uma vez para a agenda dos colaboradores conectados ao Google Agenda."
        actions={<Button onClick={abrirNovo}>Novo convite</Button>}
      />

      {erroAcao && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroAcao}</p>}

      {convitesQuery.isError ? (
        <ErrorState message="Não foi possível carregar os convites." onRetry={() => convitesQuery.refetch()} />
      ) : convitesQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : convites.length === 0 ? (
        <EmptyState title="Nenhum convite enviado" description="Crie o primeiro convite em massa para a agenda dos colaboradores." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Título</Th>
                <Th>Quando</Th>
                <Th>Criado por</Th>
                <Th>Destinatários</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {convites.map((convite) => {
                const contagem = resumo(convite);
                const temCriado = (contagem.get('CRIADO') ?? 0) > 0;
                const temPendente = (contagem.get('FALHA') ?? 0) > 0 || (contagem.get('INDISPONIVEL') ?? 0) > 0;
                return (
                  <Tr key={convite.id}>
                    <Td className="font-bold text-[var(--color-text-primary)]">
                      <button type="button" className="text-left hover:underline" onClick={() => setDetalhado(convite)}>
                        {convite.titulo}
                      </button>
                    </Td>
                    <Td>{formatarPeriodo(convite.inicio, convite.fim)}</Td>
                    <Td>{convite.criadoPor.nome}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {STATUS_CONVITE_DESTINATARIO.filter((opcao) => contagem.get(opcao.value)).map((opcao) => (
                          <Badge key={opcao.value} tone={TOM_STATUS[opcao.value]}>
                            {contagem.get(opcao.value)} {opcao.label.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
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
                        {temPendente && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={reenviarMutation.isPending}
                            onClick={() => handleReenviar(convite.id)}
                          >
                            Reenviar pendentes
                          </Button>
                        )}
                        {temCriado && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={cancelarMutation.isPending}
                            onClick={() => handleCancelar(convite.id)}
                          >
                            Cancelar
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
            </div>
            <div className="flex flex-col gap-1.5">
              {detalhado.destinatarios.map((destinatario) => (
                <div
                  key={destinatario.id}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-field)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <span className="truncate">{destinatario.user.nome}</span>
                  <Badge tone={TOM_STATUS[destinatario.status]} title={destinatario.erro ?? undefined}>
                    {STATUS_CONVITE_DESTINATARIO.find((opcao) => opcao.value === destinatario.status)?.label}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </PageShell>
  );
}
