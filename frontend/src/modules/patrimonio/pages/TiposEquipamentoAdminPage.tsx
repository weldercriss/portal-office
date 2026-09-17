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
import {
  useCreateTipoEquipamento,
  useDeleteTipoEquipamentoPermanently,
  useTiposEquipamento,
  useUpdateTipoEquipamento,
} from '../hooks/usePatrimonio';
import type { TipoEquipamento } from '../types/patrimonio.types';

export default function TiposEquipamentoAdminPage() {
  const tiposQuery = useTiposEquipamento(true);
  const createMutation = useCreateTipoEquipamento();
  const updateMutation = useUpdateTipoEquipamento();
  const deleteMutation = useDeleteTipoEquipamentoPermanently();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoEquipamento | null>(null);
  const [emEdicao, setEmEdicao] = useState<TipoEquipamento | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [exigeTermo, setExigeTermo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const tiposFiltrados = useMemo(() => {
    const tipos = tiposQuery.data ?? [];
    return tipos.filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [tiposQuery.data, busca]);

  function abrirNovo() {
    setEmEdicao(null);
    setNome('');
    setDescricao('');
    setExigeTermo(true);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(tipo: TipoEquipamento) {
    setEmEdicao(tipo);
    setNome(tipo.nome);
    setDescricao(tipo.descricao ?? '');
    setExigeTermo(tipo.exigeTermo);
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const input = { nome, descricao, exigeTermo };
    try {
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogAberto(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o tipo de equipamento.');
    }
  }

  function handleAlternarStatus(tipo: TipoEquipamento) {
    setErroLista(null);
    updateMutation.mutate(
      { id: tipo.id, input: { ativo: !tipo.ativo } },
      { onError: () => setErroLista(`Não foi possível ${tipo.ativo ? 'desativar' : 'reativar'} o tipo.`) },
    );
  }

  function confirmarExclusao() {
    if (!tipoParaExcluir) return;
    deleteMutation.mutate(tipoParaExcluir.id, {
      onSuccess: () => setTipoParaExcluir(null),
      onError: (error) => {
        setTipoParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir o tipo.');
      },
    });
  }

  if (tiposQuery.isError) {
    return <ErrorState message="Não foi possível carregar os tipos de equipamento." onRetry={() => tiposQuery.refetch()} />;
  }

  if (tiposQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  return (
    <>
      <ListToolbar actions={<Button onClick={abrirNovo}>Novo tipo</Button>}>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome" />
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {tiposFiltrados.length === 0 ? (
        <EmptyState title="Nenhum tipo de equipamento encontrado" description="Cadastre o primeiro tipo (ex.: Notebook, Headset, Mouse)." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Exige termo</Th>
                <Th>Equipamentos cadastrados</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {tiposFiltrados.map((tipo) => (
                <Tr key={tipo.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{tipo.nome}</Td>
                  <Td>{tipo.exigeTermo ? 'Sim' : 'Não'}</Td>
                  <Td>{tipo._count.equipamentos}</Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => abrirEdicao(tipo)}
                        aria-label={`Editar ${tipo.nome}`}
                        title="Editar tipo"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <StatusToggle
                        checked={tipo.ativo}
                        onChange={() => handleAlternarStatus(tipo)}
                        label={tipo.ativo ? 'Desativar tipo' : 'Reativar tipo'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => setTipoParaExcluir(tipo)}
                        aria-label={`Excluir ${tipo.nome}`}
                        title="Excluir tipo permanentemente"
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
        title={emEdicao ? 'Editar tipo' : 'Novo tipo de equipamento'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome-tipo-equipamento" error={erro ?? undefined}>
            <Input id="nome-tipo-equipamento" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="Descrição" htmlFor="descricao-tipo-equipamento" hint="Opcional">
            <Input id="descricao-tipo-equipamento" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={300} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={exigeTermo} onChange={(e) => setExigeTermo(e.target.checked)} />
            Exige termo de responsabilidade assinado na entrega
          </label>

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

      <Dialog open={!!tipoParaExcluir} onOpenChange={(open) => !open && setTipoParaExcluir(null)} title="Excluir tipo">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente o tipo <strong>{tipoParaExcluir?.nome}</strong>?
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTipoParaExcluir(null)}
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
