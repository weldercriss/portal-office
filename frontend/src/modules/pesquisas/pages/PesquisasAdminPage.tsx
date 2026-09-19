import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PesquisaDialog } from '../components/PesquisaDialog';
import { useDeletePesquisa, useEncerrarPesquisa, usePesquisas } from '../hooks/usePesquisas';
import type { Pesquisa } from '../types/pesquisa.types';
import { TIPOS_PESQUISA } from '../types/pesquisa.types';

export default function PesquisasAdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ehMaster = satisfazRole(user?.role, 'MASTER');
  const pesquisasQuery = usePesquisas();
  const encerrarMutation = useEncerrarPesquisa();
  const deleteMutation = useDeletePesquisa();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Pesquisa | null>(null);

  const pesquisas = pesquisasQuery.data ?? [];

  function confirmarExclusao() {
    if (!paraExcluir) return;
    deleteMutation.mutate(paraExcluir.id, { onSuccess: () => setParaExcluir(null) });
  }

  return (
    <PageShell>
      <PageHeader
        title="Pesquisas"
        description="Pesquisas anônimas de NPS/NR-1 e feedback 1:1 — as respostas nunca são ligadas a quem respondeu."
        actions={<Button onClick={() => setDialogAberto(true)}>Nova pesquisa</Button>}
      />

      {pesquisasQuery.isError ? (
        <ErrorState message="Não foi possível carregar as pesquisas." onRetry={() => pesquisasQuery.refetch()} />
      ) : pesquisasQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : pesquisas.length === 0 ? (
        <EmptyState title="Nenhuma pesquisa criada" description="Crie a primeira pesquisa anônima ou rodada de feedback 1:1." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Título</Th>
                <Th>Tipo</Th>
                <Th>Convidados</Th>
                <Th>Respondido</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {pesquisas.map((pesquisa) => {
                const total = pesquisa._count?.convites ?? 0;
                const respondidas = pesquisa._count?.respostas ?? 0;
                const percentual = total === 0 ? 0 : Math.round((respondidas / total) * 100);
                return (
                  <Tr key={pesquisa.id}>
                    <Td className="font-bold text-[var(--color-text-primary)]">
                      <button type="button" className="text-left hover:underline" onClick={() => navigate(`/pesquisas/${pesquisa.id}`)}>
                        {pesquisa.titulo}
                      </button>
                    </Td>
                    <Td>{TIPOS_PESQUISA.find((opcao) => opcao.value === pesquisa.tipo)?.label ?? pesquisa.tipo}</Td>
                    <Td>{total}</Td>
                    <Td>
                      {respondidas}/{total} ({percentual}%)
                    </Td>
                    <Td>
                      <Badge tone={pesquisa.ativa ? 'success' : 'neutral'}>{pesquisa.ativa ? 'Ativa' : 'Encerrada'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/pesquisas/${pesquisa.id}`)}>
                          Ver resultado
                        </Button>
                        {pesquisa.ativa && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={encerrarMutation.isPending}
                            onClick={() => encerrarMutation.mutate(pesquisa.id)}
                          >
                            Encerrar
                          </Button>
                        )}
                        {ehMaster && (
                          <Button variant="danger" size="sm" onClick={() => setParaExcluir(pesquisa)}>
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

      <PesquisaDialog open={dialogAberto} onOpenChange={setDialogAberto} />

      <Dialog open={!!paraExcluir} onOpenChange={(open) => !open && setParaExcluir(null)} title="Excluir pesquisa">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente "{paraExcluir?.titulo}"? Os convites e as respostas registradas somem junto — não dá para desfazer.
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
