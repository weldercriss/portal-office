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
  useCategoriasDocumento,
  useCreateCategoriaDocumento,
  useDeleteCategoriaDocumentoPermanently,
  useUpdateCategoriaDocumento,
} from '../hooks/useCategoriasDocumento';
import type { CategoriaDocumento } from '../types/categoria-documento.types';

/** Catálogo de categorias de documento (Contrato, Holerite, Plano de saúde...), usado na ficha do colaborador e na Central de Documentos. */
export default function CategoriasDocumentoAdminPage() {
  const categoriasQuery = useCategoriasDocumento(true);
  const createMutation = useCreateCategoriaDocumento();
  const updateMutation = useUpdateCategoriaDocumento();
  const deleteMutation = useDeleteCategoriaDocumentoPermanently();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<CategoriaDocumento | null>(null);
  const [emEdicao, setEmEdicao] = useState<CategoriaDocumento | null>(null);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const categoriasFiltradas = useMemo(() => {
    const categorias = categoriasQuery.data ?? [];
    return categorias.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [categoriasQuery.data, busca]);

  function abrirNovo() {
    setEmEdicao(null);
    setNome('');
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(categoria: CategoriaDocumento) {
    setEmEdicao(categoria);
    setNome(categoria.nome);
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input: { nome } });
      } else {
        await createMutation.mutateAsync({ nome });
      }
      setDialogAberto(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar a categoria.');
    }
  }

  function handleAlternarStatus(categoria: CategoriaDocumento) {
    setErroLista(null);
    updateMutation.mutate(
      { id: categoria.id, input: { ativo: !categoria.ativo } },
      { onError: () => setErroLista(`Não foi possível ${categoria.ativo ? 'desativar' : 'reativar'} a categoria.`) },
    );
  }

  function confirmarExclusao() {
    if (!categoriaParaExcluir) return;
    deleteMutation.mutate(categoriaParaExcluir.id, {
      onSuccess: () => setCategoriaParaExcluir(null),
      onError: (error) => {
        setCategoriaParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir a categoria.');
      },
    });
  }

  if (categoriasQuery.isError) {
    return <ErrorState message="Não foi possível carregar as categorias de documento." onRetry={() => categoriasQuery.refetch()} />;
  }

  if (categoriasQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  return (
    <>
      <ListToolbar actions={<Button onClick={abrirNovo}>Nova categoria</Button>}>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome" />
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {categoriasFiltradas.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria de documento encontrada"
          description="Cadastre a primeira categoria (ex.: Contrato, Holerite, Plano de saúde)."
        />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Documentos cadastrados</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.map((categoria) => (
                <Tr key={categoria.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{categoria.nome}</Td>
                  <Td>{categoria._count.documentos}</Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => abrirEdicao(categoria)}
                        aria-label={`Editar ${categoria.nome}`}
                        title="Editar categoria"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <StatusToggle
                        checked={categoria.ativo}
                        onChange={() => handleAlternarStatus(categoria)}
                        label={categoria.ativo ? 'Desativar categoria' : 'Reativar categoria'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => setCategoriaParaExcluir(categoria)}
                        aria-label={`Excluir ${categoria.nome}`}
                        title="Excluir categoria permanentemente"
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
        title={emEdicao ? 'Editar categoria' : 'Nova categoria de documento'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome-categoria-documento" error={erro ?? undefined}>
            <Input id="nome-categoria-documento" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} />
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

      <Dialog open={!!categoriaParaExcluir} onOpenChange={(open) => !open && setCategoriaParaExcluir(null)} title="Excluir categoria">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente a categoria <strong>{categoriaParaExcluir?.nome}</strong>?
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCategoriaParaExcluir(null)}
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
