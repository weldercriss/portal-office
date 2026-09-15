import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { ListToolbar } from '../../../components/system/ListToolbar';
import { Badge } from '../../../components/ui/Badge';
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
import { useDepartamentos } from '../../departamentos/hooks/useDepartamentos';
import { useCreateVaga, useDeleteVaga, useUpdateVaga, useVagas } from '../hooks/useRecrutamento';
import type { Vaga } from '../types/recrutamento.types';

export default function VagasAdminPage() {
  const vagasQuery = useVagas();
  const departamentosQuery = useDepartamentos();
  const createMutation = useCreateVaga();
  const updateMutation = useUpdateVaga();
  const deleteMutation = useDeleteVaga();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [vagaParaExcluir, setVagaParaExcluir] = useState<Vaga | null>(null);
  const [emEdicao, setEmEdicao] = useState<Vaga | null>(null);
  const [titulo, setTitulo] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const departamentos = departamentosQuery.data ?? [];

  function abrirNovo() {
    setEmEdicao(null);
    setTitulo('');
    setDepartamentoId('');
    setDescricao('');
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(vaga: Vaga) {
    setEmEdicao(vaga);
    setTitulo(vaga.titulo);
    setDepartamentoId(vaga.departamentoId ?? '');
    setDescricao(vaga.descricao ?? '');
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      const input = { titulo, departamentoId: departamentoId || undefined, descricao: descricao || undefined };
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível salvar a vaga.');
    }
  }

  if (vagasQuery.isError) {
    return <ErrorState message="Não foi possível carregar as vagas." onRetry={() => vagasQuery.refetch()} />;
  }
  if (vagasQuery.isLoading) return <LoadingState rows={5} />;

  const vagas = vagasQuery.data ?? [];

  return (
    <>
      <ListToolbar actions={<Button onClick={abrirNovo}>Nova vaga</Button>}>
        <p className="text-sm text-[var(--color-text-secondary)]">Gerencie as vagas abertas e o funil de candidatos.</p>
      </ListToolbar>

      {vagas.length === 0 ? (
        <EmptyState title="Nenhuma vaga cadastrada" description="Cadastre a primeira vaga." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Título</Th>
                <Th>Departamento</Th>
                <Th>Candidatos</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {vagas.map((vaga) => (
                <Tr key={vaga.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">
                    <Link to={`/configuracoes/vagas/${vaga.id}`} className="hover:underline">
                      {vaga.titulo}
                    </Link>
                  </Td>
                  <Td>{vaga.departamento?.nome ?? '—'}</Td>
                  <Td>{vaga._count.candidatos}</Td>
                  <Td>
                    <Badge tone={vaga.aberta ? 'success' : 'neutral'}>{vaga.aberta ? 'Aberta' : 'Fechada'}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => abrirEdicao(vaga)}
                        aria-label={`Editar ${vaga.titulo}`}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <StatusToggle
                        checked={vaga.aberta}
                        onChange={() => updateMutation.mutate({ id: vaga.id, input: { aberta: !vaga.aberta } })}
                        label={vaga.aberta ? 'Fechar vaga' : 'Reabrir vaga'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => setVagaParaExcluir(vaga)}
                        aria-label={`Excluir ${vaga.titulo}`}
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto} title={emEdicao ? 'Editar vaga' : 'Nova vaga'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Título" htmlFor="vaga-titulo">
            <Input id="vaga-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </FormField>
          <FormField label="Departamento (opcional)" htmlFor="vaga-departamento">
            <Select id="vaga-departamento" value={departamentoId} onChange={(e) => setDepartamentoId(e.target.value)}>
              <option value="">— Sem departamento —</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Descrição (opcional)" htmlFor="vaga-descricao" error={erro ?? undefined}>
            <Input id="vaga-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
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

      <Dialog open={!!vagaParaExcluir} onOpenChange={(open) => !open && setVagaParaExcluir(null)} title="Excluir vaga">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente a vaga <strong>{vagaParaExcluir?.titulo}</strong>? Os candidatos vinculados também
            serão excluídos.
          </p>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setVagaParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (vagaParaExcluir) deleteMutation.mutate(vagaParaExcluir.id, { onSuccess: () => setVagaParaExcluir(null) });
              }}
              disabled={deleteMutation.isPending}
            >
              Excluir permanentemente
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </>
  );
}
