import { useMemo, useState } from 'react';
import { CalendarX2, Check, Pencil, Trash2 } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useAuth } from '../../../shared/auth/AuthContext';
import { satisfazRole } from '../../../types/auth.types';
import { GradeHorarios } from '../components/GradeHorarios';
import { ReservaDialog } from '../components/ReservaDialog';
import { SalaDialog } from '../components/SalaDialog';
import { SolicitarReservaDialog } from '../components/SolicitarReservaDialog';
import {
  useAgendamentoConfig,
  useCancelarMinhaReserva,
  useCancelarReserva,
  useDeleteReserva,
  useHorarios,
  useReservas,
  useSalas,
  useUpdateReserva,
} from '../hooks/useAgendamento';
import { useAgendamentoSocket } from '../hooks/useAgendamentoSocket';
import type { Reserva, ReservaStatus, Sala } from '../types/agendamento.types';
import { STATUS_RESERVA } from '../types/agendamento.types';
import { estadoTemporalReserva } from '../utils/horarios';

const TOM_STATUS: Record<ReservaStatus, 'success' | 'warning' | 'neutral'> = {
  CONFIRMADA: 'success',
  SOLICITADA: 'warning',
  CANCELADA: 'neutral',
};

/** Hoje no calendário de quem está olhando: `toISOString` cru viraria o dia
 * depois das 21h no horário de Brasília. */
function hojeIso(): string {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** O dia vem em UTC do backend: formatar em UTC evita voltar 21h e cair na véspera. */
function formatarData(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function AgendamentosPage() {
  useAgendamentoSocket();

  const { user } = useAuth();
  const podeGerenciar = satisfazRole(user?.role, 'ADMIN');
  const isMaster = user?.role === 'MASTER';

  const [data, setData] = useState(hojeIso);
  const [salaId, setSalaId] = useState('');
  const [status, setStatus] = useState<ReservaStatus | ''>('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [solicitacaoDialogAberto, setSolicitacaoDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Reserva | null>(null);
  const [paraCancelar, setParaCancelar] = useState<Reserva | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Reserva | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [salaDialogAberto, setSalaDialogAberto] = useState(false);
  const [salaEmEdicao, setSalaEmEdicao] = useState<Sala | null>(null);

  const salasQuery = useSalas();
  const configQuery = useAgendamentoConfig();
  const reservasQuery = useReservas({
    from: data,
    to: data,
    salaId: salaId || undefined,
    status: status || undefined,
  });
  const cancelarMutation = useCancelarReserva();
  const cancelarMinhaMutation = useCancelarMinhaReserva();
  const confirmarMutation = useUpdateReserva();
  const deleteMutation = useDeleteReserva();

  const salas = salasQuery.data ?? [];
  // A grade só faz sentido para uma sala de cada vez.
  const salaDaGrade = salaId || (salas.length === 1 ? salas[0].id : '');
  const salaSelecionada = salas.find((sala) => sala.id === salaId);
  const horariosQuery = useHorarios(salaDaGrade || undefined, data);

  const reservas = useMemo(() => reservasQuery.data ?? [], [reservasQuery.data]);
  const podeSolicitar = user?.role === 'USER' && configQuery.data?.permiteSolicitacaoColaborador === true;
  const podeCancelarMinha = (reserva: Reserva) =>
    user?.role === 'USER' && reserva.solicitanteId === user.id && reserva.status === 'SOLICITADA';
  const temAcoes = podeGerenciar || reservas.some(podeCancelarMinha);

  function abrirNova() {
    setEmEdicao(null);
    setDialogAberto(true);
  }

  function abrirEdicao(reserva: Reserva) {
    setEmEdicao(reserva);
    setDialogAberto(true);
  }

  function abrirNovaSala() {
    setSalaEmEdicao(null);
    setSalaDialogAberto(true);
  }

  function abrirEdicaoSala(sala: Sala) {
    setSalaEmEdicao(sala);
    setSalaDialogAberto(true);
  }

  /** A sala recém-criada já fica selecionada no filtro, pronta pra reservar. */
  function handleSalaSalva(sala: Sala) {
    setSalaId(sala.id);
  }

  /** Um clique, sem abrir o diálogo de edição — a confirmação não precisa de mais nada. */
  function handleConfirmar(reserva: Reserva) {
    setErroLista(null);
    confirmarMutation.mutate(
      { id: reserva.id, input: { status: 'CONFIRMADA' } },
      { onError: () => setErroLista('Não foi possível confirmar a reserva.') },
    );
  }

  function confirmarCancelamento() {
    if (!paraCancelar) return;
    setErroLista(null);
    const onSuccess = () => {
      setParaCancelar(null);
      setMotivo('');
    };
    const onError = (error: unknown) => {
      setParaCancelar(null);
      setErroLista(error instanceof Error ? error.message : 'Não foi possível cancelar a reserva.');
    };

    if (podeGerenciar) {
      cancelarMutation.mutate(
        { id: paraCancelar.id, motivo: motivo.trim() || undefined },
        { onSuccess, onError },
      );
    } else {
      cancelarMinhaMutation.mutate(paraCancelar.id, {
        onSuccess: () => {
          onSuccess();
        },
        onError,
      });
    }
  }

  /** Só master: exclui de vez uma reserva já encerrada — a API já nunca teve essa restrição, só a tela escondia a ação. */
  function confirmarExclusao() {
    if (!paraExcluir) return;
    setErroLista(null);
    deleteMutation.mutate(paraExcluir.id, {
      onSuccess: () => setParaExcluir(null),
      onError: (error) => {
        setParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir a reserva.');
      },
    });
  }

  if (salasQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar as salas." onRetry={() => salasQuery.refetch()} />
      </PageShell>
    );
  }

  if (salasQuery.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={4} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Agendamentos"
        description="Reserve as salas da Suri e acompanhe os horários que ainda estão livres."
        actions={
          podeGerenciar ? (
            <>
              <Button variant="secondary" onClick={abrirNovaSala}>
                Nova sala
              </Button>
              {salas.length > 0 && <Button onClick={abrirNova}>Nova reserva</Button>}
            </>
          ) : podeSolicitar && salas.length > 0 ? (
            <Button onClick={() => setSolicitacaoDialogAberto(true)}>Solicitar sala</Button>
          ) : undefined
        }
      />

      {salas.length === 0 ? (
        <EmptyState
          title="Nenhuma sala cadastrada"
          description={
            podeGerenciar
              ? 'Cadastre a primeira sala e os horários disponíveis para começar a reservar.'
              : 'Peça a um administrador para cadastrar as salas em Configurações.'
          }
          action={podeGerenciar ? <Button onClick={abrirNovaSala}>Cadastrar sala</Button> : undefined}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 pb-6">
            <FormField label="Data" htmlFor="filtro-data" className="w-44">
              <Input id="filtro-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </FormField>
            <FormField label="Sala" htmlFor="filtro-sala" className="w-56">
              <div className="flex items-center gap-2">
                <Select id="filtro-sala" value={salaId} onChange={(e) => setSalaId(e.target.value)}>
                  <option value="">Todas as salas</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.nome}
                    </option>
                  ))}
                </Select>
                {podeGerenciar && salaSelecionada && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 shrink-0 p-0"
                    onClick={() => abrirEdicaoSala(salaSelecionada)}
                    aria-label={`Editar ${salaSelecionada.nome}`}
                    title="Editar sala"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </FormField>
            <FormField label="Status" htmlFor="filtro-status" className="w-48">
              <Select id="filtro-status" value={status} onChange={(e) => setStatus(e.target.value as ReservaStatus | '')}>
                <option value="">Todos os status</option>
                {STATUS_RESERVA.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {salaDaGrade && (
            <Card className="mb-6 p-5">
              <CardTitle>Horários em {formatarData(data)}</CardTitle>
              {horariosQuery.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : horariosQuery.isError ? (
                <p className="text-sm text-[var(--color-danger)]">Não foi possível carregar os horários.</p>
              ) : (horariosQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Esta sala não abre nesse dia da semana.</p>
              ) : (
                <GradeHorarios data={data} horarios={horariosQuery.data ?? []} />
              )}
            </Card>
          )}

          {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

          {reservasQuery.isError ? (
            <ErrorState message="Não foi possível carregar as reservas." onRetry={() => reservasQuery.refetch()} />
          ) : reservasQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : reservas.length === 0 ? (
            <EmptyState
              title="Nenhuma reserva nesse dia"
              description="Ajuste os filtros ou registre a primeira reserva."
            />
          ) : (
            <Card elevated className="overflow-hidden">
              <Table>
                <thead>
                  <tr>
                    <Th>Solicitante</Th>
                    <Th>Responsável</Th>
                    <Th>Sala</Th>
                    <Th>Data</Th>
                    <Th>Horário</Th>
                    <Th>Status</Th>
                    {temAcoes && <Th className="text-right">Ações</Th>}
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => (
                    <Tr key={reserva.id}>
                      <Td className="font-bold text-[var(--color-text-primary)]">
                        {reserva.solicitante.nome}
                        {reserva.titulo && (
                          <span className="block text-xs font-normal text-[var(--color-text-muted)]">
                            {reserva.titulo}
                          </span>
                        )}
                      </Td>
                      <Td>{reserva.responsavel?.nome ?? '—'}</Td>
                      <Td>{reserva.sala.nome}</Td>
                      <Td>{formatarData(reserva.data)}</Td>
                      <Td>
                        {reserva.horaInicio} às {reserva.horaFim}
                      </Td>
                      <Td>
                        <Badge tone={TOM_STATUS[reserva.status]}>
                          {STATUS_RESERVA.find((opcao) => opcao.value === reserva.status)?.label ?? reserva.status}
                        </Badge>
                      </Td>
                      {temAcoes && (
                        <Td className="text-right">
                          {podeGerenciar ? (() => {
                            if (reserva.status === 'CANCELADA') return null;

                            // Solicitada ainda não foi decidida: segue editável mesmo com o horário já passado.
                            // Confirmada é um compromisso assumido — trava com o tempo (só cancela, depois nem isso).
                            const solicitada = reserva.status === 'SOLICITADA';
                            const estado = estadoTemporalReserva(reserva);
                            const editavel = solicitada || estado === 'FUTURA';

                            if (!editavel && estado === 'FINALIZADA') {
                              if (!isMaster) return <span className="text-xs text-[var(--color-text-muted)]">Encerrada</span>;
                              return (
                                <div className="inline-flex items-center justify-end gap-2">
                                  <span className="text-xs text-[var(--color-text-muted)]">Encerrada</span>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => setParaExcluir(reserva)}
                                    aria-label={`Excluir reserva encerrada de ${reserva.solicitante.nome}`}
                                    title="Excluir permanentemente (master)"
                                  >
                                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                    Excluir
                                  </Button>
                                </div>
                              );
                            }

                            return (
                              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                {solicitada && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5 text-[var(--color-success)]"
                                    disabled={confirmarMutation.isPending}
                                    onClick={() => handleConfirmar(reserva)}
                                    aria-label={`Confirmar reserva de ${reserva.solicitante.nome}`}
                                    title="Confirmar reserva"
                                  >
                                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                    Confirmar
                                  </Button>
                                )}
                                {editavel && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => abrirEdicao(reserva)}
                                    aria-label={`Editar reserva de ${reserva.solicitante.nome}`}
                                    title="Editar reserva"
                                  >
                                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                    Editar
                                  </Button>
                                )}
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => {
                                    setMotivo('');
                                    setParaCancelar(reserva);
                                  }}
                                  aria-label={`Cancelar reserva de ${reserva.solicitante.nome}`}
                                  title="Cancelar reserva"
                                >
                                  <CalendarX2 aria-hidden="true" className="h-3.5 w-3.5" />
                                  Cancelar
                                </Button>
                              </div>
                            );
                          })() : podeCancelarMinha(reserva) ? (
                            <Button
                              variant="danger"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setParaCancelar(reserva)}
                              aria-label={`Cancelar solicitação de ${reserva.sala.nome}`}
                              title="Cancelar solicitação"
                            >
                              <CalendarX2 aria-hidden="true" className="h-3.5 w-3.5" />
                              Cancelar solicitação
                            </Button>
                          ) : null}
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}

      {podeGerenciar && (
        <>
          <ReservaDialog
            open={dialogAberto}
            onOpenChange={setDialogAberto}
            salas={salas}
            reserva={emEdicao}
            dataPadrao={data}
            salaPadrao={salaId || undefined}
          />
          <SalaDialog
            open={salaDialogAberto}
            onOpenChange={setSalaDialogAberto}
            sala={salaEmEdicao}
            onSaved={handleSalaSalva}
          />
        </>
      )}

      {podeSolicitar && (
        <SolicitarReservaDialog
          open={solicitacaoDialogAberto}
          onOpenChange={setSolicitacaoDialogAberto}
          salas={salas}
          dataPadrao={data}
          salaPadrao={salaId || undefined}
        />
      )}

      <Dialog
        open={!!paraCancelar}
        onOpenChange={(aberto) => !aberto && setParaCancelar(null)}
        title={podeGerenciar ? 'Cancelar reserva' : 'Cancelar solicitação'}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {podeGerenciar ? (
              <>
                Cancelar a reserva de <strong>{paraCancelar?.solicitante.nome}</strong> em{' '}
                <strong>{paraCancelar?.sala.nome}</strong>? O horário volta a ficar disponível e o evento sai da agenda de
                quem pediu.
              </>
            ) : (
              <>
                Cancelar sua solicitação para <strong>{paraCancelar?.sala.nome}</strong>? O horário voltará a ficar
                disponível.
              </>
            )}
          </p>
          {podeGerenciar && (
            <FormField label="Motivo (opcional)" htmlFor="motivo-cancelamento">
              <Input
                id="motivo-cancelamento"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={300}
                placeholder="Sala em manutenção"
              />
            </FormField>
          )}
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setParaCancelar(null)}
              disabled={cancelarMutation.isPending || cancelarMinhaMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmarCancelamento}
              disabled={cancelarMutation.isPending || cancelarMinhaMutation.isPending}
            >
              {cancelarMutation.isPending || cancelarMinhaMutation.isPending
                ? 'Cancelando...'
                : podeGerenciar
                  ? 'Cancelar reserva'
                  : 'Cancelar solicitação'}
            </Button>
          </FormActions>
        </div>
      </Dialog>

      <Dialog open={!!paraExcluir} onOpenChange={(aberto) => !aberto && setParaExcluir(null)} title="Excluir reserva encerrada">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente a reserva de <strong>{paraExcluir?.solicitante.nome}</strong> em{' '}
            <strong>{paraExcluir?.sala.nome}</strong>? Ação exclusiva de master — reservas encerradas normalmente não
            podem ser removidas. Não há como desfazer.
          </p>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setParaExcluir(null)} disabled={deleteMutation.isPending}>
              Voltar
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
