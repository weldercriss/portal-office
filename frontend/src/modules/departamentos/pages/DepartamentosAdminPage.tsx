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
import { Select } from '../../../components/ui/Select';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { SubAreasDialog } from '../../subareas/components/SubAreasDialog';
import { useSubAreas } from '../../subareas/hooks/useSubAreas';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import {
  useCreateDepartamento,
  useDeleteDepartamentoPermanently,
  useDepartamentos,
  useUpdateDepartamento,
} from '../hooks/useDepartamentos';
import type { Departamento } from '../types/departamento.types';

export default function DepartamentosAdminPage() {
  const departamentosQuery = useDepartamentos();
  const usuariosQuery = useUsuarios();
  const createMutation = useCreateDepartamento();
  const updateMutation = useUpdateDepartamento();
  const deleteMutation = useDeleteDepartamentoPermanently();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'desativados' | 'todos'>('ativos');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [departamentoParaExcluir, setDepartamentoParaExcluir] = useState<Departamento | null>(null);
  const [departamentoSubAreas, setDepartamentoSubAreas] = useState<Departamento | null>(null);
  const [emEdicao, setEmEdicao] = useState<Departamento | null>(null);
  const [nome, setNome] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [fazPlantao, setFazPlantao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const subAreasQuery = useSubAreas();
  const usuariosAtivos = useMemo(() => (usuariosQuery.data ?? []).filter((u) => u.ativo), [usuariosQuery.data]);

  const areasPorDepartamento = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const area of subAreasQuery.data ?? []) {
      mapa.set(area.groupId, [...(mapa.get(area.groupId) ?? []), area.nome]);
    }
    return mapa;
  }, [subAreasQuery.data]);

  const departamentosFiltrados = useMemo(() => {
    const departamentos = departamentosQuery.data ?? [];
    return departamentos.filter((d) => {
      const statusValido = filtroStatus === 'todos' || (filtroStatus === 'ativos' ? d.ativo : !d.ativo);
      return statusValido && d.nome.toLowerCase().includes(busca.toLowerCase());
    });
  }, [departamentosQuery.data, busca, filtroStatus]);

  function abrirNovo() {
    setEmEdicao(null);
    setNome('');
    setResponsavelId('');
    setFazPlantao(false);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(departamento: Departamento) {
    setEmEdicao(departamento);
    setNome(departamento.nome);
    setResponsavelId(departamento.responsavelId ?? '');
    setFazPlantao(departamento.fazPlantao);
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      if (emEdicao) {
        await updateMutation.mutateAsync({
          id: emEdicao.id,
          input: { nome, responsavelId: responsavelId || null, fazPlantao },
        });
      } else {
        await createMutation.mutateAsync({ nome, responsavelId: responsavelId || null, fazPlantao });
      }
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível salvar o departamento.');
    }
  }

  function handleAlternarStatus(departamento: Departamento) {
    setErroLista(null);
    updateMutation.mutate(
      { id: departamento.id, input: { ativo: !departamento.ativo } },
      {
        onError: () => setErroLista(`Não foi possível ${departamento.ativo ? 'desativar' : 'reativar'} o departamento.`),
      },
    );
  }

  function handleExcluir(departamento: Departamento) {
    setErroLista(null);
    setDepartamentoParaExcluir(departamento);
  }

  function confirmarExclusao() {
    if (!departamentoParaExcluir) return;
    deleteMutation.mutate(departamentoParaExcluir.id, {
      onSuccess: () => setDepartamentoParaExcluir(null),
      onError: (error) => {
        setDepartamentoParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir o departamento.');
      },
    });
  }

  if (departamentosQuery.isError) {
    return <ErrorState message="Não foi possível carregar os departamentos." onRetry={() => departamentosQuery.refetch()} />;
  }

  if (departamentosQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  return (
    <>
      <ListToolbar actions={<Button onClick={abrirNovo}>Novo departamento</Button>}>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome" />
          <Select
            aria-label="Filtrar departamentos por status"
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value as typeof filtroStatus)}
            className="max-w-[180px]"
          >
            <option value="ativos">Ativos</option>
            <option value="desativados">Desativados</option>
            <option value="todos">Todos</option>
          </Select>
        </div>
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {departamentosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum departamento encontrado" description="Cadastre o primeiro departamento." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Área</Th>
                <Th>Responsável</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {departamentosFiltrados.map((departamento) => (
                <Tr key={departamento.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{departamento.nome}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setDepartamentoSubAreas(departamento)}
                      className="text-left text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:underline"
                      title="Gerenciar áreas"
                    >
                      {(areasPorDepartamento.get(departamento.id) ?? []).join(', ') || '— Adicionar área —'}
                    </button>
                  </Td>
                  <Td>{departamento.responsavel?.nome ?? '—'}</Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => abrirEdicao(departamento)}
                        aria-label={`Editar ${departamento.nome}`}
                        title="Editar departamento"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <StatusToggle
                        checked={departamento.ativo}
                        onChange={() => handleAlternarStatus(departamento)}
                        label={departamento.ativo ? 'Desativar departamento' : 'Reativar departamento'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => handleExcluir(departamento)}
                        aria-label={`Excluir ${departamento.nome}`}
                        title="Excluir departamento permanentemente"
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

      <Dialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        title={emEdicao ? 'Editar departamento' : 'Novo departamento'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome-departamento" error={erro ?? undefined}>
            <Input id="nome-departamento" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="Responsável (opcional)" htmlFor="responsavel-departamento">
            <Select
              id="responsavel-departamento"
              value={responsavelId}
              onChange={(event) => setResponsavelId(event.target.value)}
            >
              <option value="">Nenhum</option>
              {usuariosAtivos.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <StatusToggle checked={fazPlantao} onChange={setFazPlantao} label="Este departamento faz plantão" />
            <p className="max-w-xs text-[13px] text-[var(--color-text-muted)]">
              Só quem está num departamento com plantão pode ser escalado como plantonista.
            </p>
          </div>
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

      <Dialog
        open={!!departamentoParaExcluir}
        onOpenChange={(open) => !open && setDepartamentoParaExcluir(null)}
        title="Excluir departamento"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente o departamento <strong>{departamentoParaExcluir?.nome}</strong>?
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDepartamentoParaExcluir(null)}
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

      {departamentoSubAreas && (
        <SubAreasDialog
          open={!!departamentoSubAreas}
          onOpenChange={(open) => !open && setDepartamentoSubAreas(null)}
          groupId={departamentoSubAreas.id}
          groupNome={departamentoSubAreas.nome}
        />
      )}
    </>
  );
}
