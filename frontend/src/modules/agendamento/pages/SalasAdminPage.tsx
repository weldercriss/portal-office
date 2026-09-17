import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { ListToolbar } from '../../../components/system/ListToolbar';
import { SearchField } from '../../../components/system/SearchField';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions } from '../../../components/ui/Form';
import { LoadingState } from '../../../components/ui/LoadingState';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { SalaDialog } from '../components/SalaDialog';
import {
  useAgendamentoConfig,
  useDeleteSalaPermanently,
  useSalas,
  useUpdateAgendamentoConfig,
  useUpdateSala,
} from '../hooks/useAgendamento';
import type { Sala } from '../types/agendamento.types';
import { DIAS_SEMANA } from '../types/agendamento.types';

/** Resume a grade da sala numa linha: "Seg 09:00–18:00 · Ter 09:00–12:00". */
function resumirJanelas(sala: Sala): string {
  if (sala.disponibilidades.length === 0) return 'Sem horários cadastrados';
  return sala.disponibilidades
    .map((janela) => {
      const dia = DIAS_SEMANA.find((d) => d.value === janela.diaSemana)?.curto ?? '?';
      return `${dia} ${janela.horaInicio}–${janela.horaFim}`;
    })
    .join(' · ');
}

export default function SalasAdminPage() {
  const salasQuery = useSalas(true);
  const configQuery = useAgendamentoConfig();
  const updateConfigMutation = useUpdateAgendamentoConfig();
  const updateMutation = useUpdateSala();
  const deleteMutation = useDeleteSalaPermanently();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Sala | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Sala | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const salasFiltradas = useMemo(() => {
    const salas = salasQuery.data ?? [];
    const termo = busca.toLowerCase();
    return salas.filter(
      (sala) => sala.nome.toLowerCase().includes(termo) || (sala.localizacao ?? '').toLowerCase().includes(termo),
    );
  }, [salasQuery.data, busca]);

  function abrirNova() {
    setEmEdicao(null);
    setDialogAberto(true);
  }

  function abrirEdicao(sala: Sala) {
    setEmEdicao(sala);
    setDialogAberto(true);
  }

  function handleAlternarStatus(sala: Sala) {
    setErroLista(null);
    updateMutation.mutate(
      { id: sala.id, input: { ativo: !sala.ativo } },
      { onError: () => setErroLista(`Não foi possível ${sala.ativo ? 'desativar' : 'reativar'} a sala.`) },
    );
  }

  function confirmarExclusao() {
    if (!paraExcluir) return;
    deleteMutation.mutate(paraExcluir.id, {
      onSuccess: () => setParaExcluir(null),
      onError: (error) => {
        setParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir a sala.');
      },
    });
  }

  function alterarSolicitacaoColaborador(checked: boolean) {
    setErroLista(null);
    updateConfigMutation.mutate(
      { permiteSolicitacaoColaborador: checked },
      { onError: () => setErroLista('Não foi possível atualizar a permissão de solicitação de salas.') },
    );
  }

  if (salasQuery.isError) {
    return <ErrorState message="Não foi possível carregar as salas." onRetry={() => salasQuery.refetch()} />;
  }

  if (salasQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  return (
    <>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="max-w-2xl">
          <CardTitle>Solicitações de colaboradores</CardTitle>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
            Quando habilitado, o colaborador pode solicitar uma sala para si. O pedido fica pendente até um
            administrador confirmar ou cancelar.
          </p>
        </div>
        {configQuery.isLoading ? (
          <span className="text-sm text-[var(--color-text-muted)]">Carregando configuração...</span>
        ) : configQuery.isError ? (
          <Button variant="secondary" onClick={() => configQuery.refetch()}>Tentar novamente</Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--color-text-secondary)]">
              {configQuery.data?.permiteSolicitacaoColaborador ? 'Habilitado' : 'Desabilitado'}
            </span>
            <StatusToggle
              checked={configQuery.data?.permiteSolicitacaoColaborador ?? false}
              onChange={alterarSolicitacaoColaborador}
              label="Permitir que colaboradores solicitem salas"
            />
          </div>
        )}
      </Card>

      <ListToolbar actions={<Button onClick={abrirNova}>Nova sala</Button>}>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome ou local" />
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {salasFiltradas.length === 0 ? (
        <EmptyState title="Nenhuma sala encontrada" description="Cadastre a primeira sala e os horários dela." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Sala</Th>
                <Th>Local</Th>
                <Th>Capacidade</Th>
                <Th>Disponibilidade</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {salasFiltradas.map((sala) => (
                <Tr key={sala.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{sala.nome}</Td>
                  <Td>{sala.localizacao ?? '—'}</Td>
                  <Td>{sala.capacidade ? `${sala.capacidade} pessoas` : '—'}</Td>
                  <Td className="text-xs">{resumirJanelas(sala)}</Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => abrirEdicao(sala)}
                        aria-label={`Editar ${sala.nome}`}
                        title="Editar sala"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <StatusToggle
                        checked={sala.ativo}
                        onChange={() => handleAlternarStatus(sala)}
                        label={sala.ativo ? 'Desativar sala' : 'Reativar sala'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => setParaExcluir(sala)}
                        aria-label={`Excluir ${sala.nome}`}
                        title="Excluir sala permanentemente"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <SalaDialog open={dialogAberto} onOpenChange={setDialogAberto} sala={emEdicao} />

      <Dialog open={!!paraExcluir} onOpenChange={(aberto) => !aberto && setParaExcluir(null)} title="Excluir sala">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente a sala <strong>{paraExcluir?.nome}</strong>? Salas com reservas registradas não
            podem ser excluídas — desative-a para tirá-la das novas reservas.
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setParaExcluir(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarExclusao} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </>
  );
}
