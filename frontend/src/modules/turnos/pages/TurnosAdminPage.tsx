import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { ListToolbar } from '../../../components/system/ListToolbar';
import { SearchField } from '../../../components/system/SearchField';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useCreateTurno, useDeleteTurnoPermanently, useTurnos, useUpdateTurno } from '../hooks/useTurnos';
import type { Turno } from '../types/turno.types';

export default function TurnosAdminPage() {
  const turnosQuery = useTurnos(true);
  const createMutation = useCreateTurno();
  const updateMutation = useUpdateTurno();
  const deleteMutation = useDeleteTurnoPermanently();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [turnoParaExcluir, setTurnoParaExcluir] = useState<Turno | null>(null);
  const [emEdicao, setEmEdicao] = useState<Turno | null>(null);
  const [nome, setNome] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const turnosFiltrados = useMemo(() => {
    const turnos = turnosQuery.data ?? [];
    return turnos.filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [turnosQuery.data, busca]);

  function abrirNovo() {
    setEmEdicao(null);
    setNome('');
    setHoraInicio('');
    setHoraFim('');
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(turno: Turno) {
    setEmEdicao(turno);
    setNome(turno.nome);
    setHoraInicio(turno.horaInicio);
    setHoraFim(turno.horaFim);
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const input = { nome, horaInicio, horaFim };
    try {
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível salvar o turno.');
    }
  }

  function handleAlternarStatus(turno: Turno) {
    setErroLista(null);
    updateMutation.mutate(
      { id: turno.id, input: { ativo: !turno.ativo } },
      { onError: () => setErroLista(`Não foi possível ${turno.ativo ? 'desativar' : 'reativar'} o turno.`) },
    );
  }

  function confirmarExclusao() {
    if (!turnoParaExcluir) return;
    deleteMutation.mutate(turnoParaExcluir.id, {
      onSuccess: () => setTurnoParaExcluir(null),
      onError: (error) => {
        setTurnoParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir o turno.');
      },
    });
  }

  if (turnosQuery.isError) {
    return <ErrorState message="Não foi possível carregar os turnos." onRetry={() => turnosQuery.refetch()} />;
  }

  if (turnosQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  return (
    <>
      <ListToolbar actions={<Button onClick={abrirNovo}>Novo turno</Button>}>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome" />
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {turnosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum turno encontrado" description="Cadastre o primeiro turno." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Início</Th>
                <Th>Fim</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {turnosFiltrados.map((turno) => (
                <Tr key={turno.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{turno.nome}</Td>
                  <Td>{turno.horaInicio}</Td>
                  <Td>{turno.horaFim}</Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => abrirEdicao(turno)}
                        aria-label={`Editar ${turno.nome}`}
                        title="Editar turno"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <StatusToggle
                        checked={turno.ativo}
                        onChange={() => handleAlternarStatus(turno)}
                        label={turno.ativo ? 'Desativar turno' : 'Reativar turno'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => setTurnoParaExcluir(turno)}
                        aria-label={`Excluir ${turno.nome}`}
                        title="Excluir turno permanentemente"
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto} title={emEdicao ? 'Editar turno' : 'Novo turno'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome-turno" error={erro ?? undefined}>
            <Input id="nome-turno" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="Hora de início" htmlFor="hora-inicio-turno">
            <Input
              id="hora-inicio-turno"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Hora de fim" htmlFor="hora-fim-turno">
            <Input id="hora-fim-turno" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              Salvar
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog open={!!turnoParaExcluir} onOpenChange={(open) => !open && setTurnoParaExcluir(null)} title="Excluir turno">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente o turno <strong>{turnoParaExcluir?.nome}</strong>?
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTurnoParaExcluir(null)}
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
