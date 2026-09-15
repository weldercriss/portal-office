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
  useCreateTipoSolicitacao,
  useDeleteTipoSolicitacaoPermanently,
  useTiposSolicitacao,
  useUpdateTipoSolicitacao,
} from '../hooks/useTiposSolicitacao';
import type { TipoSolicitacao } from '../types/tipo-solicitacao.types';

export default function TiposSolicitacaoAdminPage() {
  const tiposQuery = useTiposSolicitacao(true);
  const createMutation = useCreateTipoSolicitacao();
  const updateMutation = useUpdateTipoSolicitacao();
  const deleteMutation = useDeleteTipoSolicitacaoPermanently();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoSolicitacao | null>(null);
  const [emEdicao, setEmEdicao] = useState<TipoSolicitacao | null>(null);
  const [nome, setNome] = useState('');
  const [requerAprovacao, setRequerAprovacao] = useState(true);
  const [contaComoAfastamento, setContaComoAfastamento] = useState(true);
  const [ehFolga, setEhFolga] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const tiposFiltrados = useMemo(() => {
    const tipos = tiposQuery.data ?? [];
    return tipos.filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [tiposQuery.data, busca]);

  function abrirNovo() {
    setEmEdicao(null);
    setNome('');
    setRequerAprovacao(true);
    setContaComoAfastamento(true);
    setEhFolga(false);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(tipo: TipoSolicitacao) {
    setEmEdicao(tipo);
    setNome(tipo.nome);
    setRequerAprovacao(tipo.requerAprovacao);
    setContaComoAfastamento(tipo.contaComoAfastamento);
    setEhFolga(tipo.ehFolga);
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const input = { nome, requerAprovacao, contaComoAfastamento, ehFolga };
    try {
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível salvar o tipo de solicitação.');
    }
  }

  function handleAlternarStatus(tipo: TipoSolicitacao) {
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
    return <ErrorState message="Não foi possível carregar os tipos de solicitação." onRetry={() => tiposQuery.refetch()} />;
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
        <EmptyState title="Nenhum tipo de solicitação encontrado" description="Cadastre o primeiro tipo." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Passa por aprovação</Th>
                <Th>Conta como afastamento</Th>
                <Th>É folga</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {tiposFiltrados.map((tipo) => (
                <Tr key={tipo.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{tipo.nome}</Td>
                  <Td>{tipo.requerAprovacao ? 'Sim' : 'Não'}</Td>
                  <Td>{tipo.contaComoAfastamento ? 'Sim' : 'Não'}</Td>
                  <Td>{tipo.ehFolga ? 'Sim' : 'Não'}</Td>
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto} title={emEdicao ? 'Editar tipo' : 'Novo tipo de solicitação'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome-tipo-solicitacao" error={erro ?? undefined}>
            <Input id="nome-tipo-solicitacao" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={requerAprovacao} onChange={(e) => setRequerAprovacao(e.target.checked)} />
            Passa por aprovação (o colaborador solicita, o admin aprova ou rejeita)
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={contaComoAfastamento}
              onChange={(e) => setContaComoAfastamento(e.target.checked)}
            />
            Conta como afastamento (bloqueia escala de plantão no período)
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={ehFolga} onChange={(e) => setEhFolga(e.target.checked)} />
            É folga (aparece no widget de folgas do dashboard)
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
