import { useMemo } from 'react';
import { PageShell } from '../../../components/system/PageShell';
import { Card, CardTitle } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { usePlantoes } from '../../plantoes/hooks/usePlantoes';
import { useMinhasSolicitacoes } from '../../solicitacoes/hooks/useSolicitacoes';
import { useAuth } from '../../../shared/auth/AuthContext';
import AdminDashboardPage from './AdminDashboardPage';

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function KpiTile({ label, valor }: { label: string; valor: string }) {
  return (
    <Card elevated className="flex-1 p-5">
      <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-bricolage text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
        {valor}
      </p>
    </Card>
  );
}

function ListaResumo({
  itens,
  vazio,
}: {
  itens: { chave: string; titulo: string; subtitulo: string }[];
  vazio: string;
}) {
  if (itens.length === 0) {
    return <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{vazio}</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {itens.map((item) => (
        <li key={item.chave} className="border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0">
          <p className="font-bold text-[var(--color-text-primary)]">{item.titulo}</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">{item.subtitulo}</p>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboardPage />;
  return <ColaboradorDashboard />;
}

function ColaboradorDashboard() {
  const { user } = useAuth();
  const from = hoje();

  const plantoesQuery = usePlantoes({ userId: user?.id, status: 'PUBLICADO', from });
  const ausenciasQuery = useMinhasSolicitacoes({ status: 'APROVADA', contaComoAfastamento: true, ehFolga: false, from });
  const folgasQuery = useMinhasSolicitacoes({ status: 'APROVADA', ehFolga: true, from });

  const proximosPlantoes = useMemo(
    () => [...(plantoesQuery.data ?? [])].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5),
    [plantoesQuery.data],
  );
  const proximasAusencias = useMemo(
    () => [...(ausenciasQuery.data ?? [])].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)).slice(0, 5),
    [ausenciasQuery.data],
  );
  const proximasFolgas = useMemo(
    () => [...(folgasQuery.data ?? [])].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)).slice(0, 5),
    [folgasQuery.data],
  );

  const carregando = plantoesQuery.isLoading || ausenciasQuery.isLoading || folgasQuery.isLoading;
  const comErro = plantoesQuery.isError || ausenciasQuery.isError || folgasQuery.isError;

  if (comErro) {
    return (
      <PageShell>
        <ErrorState
          message="Não foi possível carregar o dashboard."
          onRetry={() => {
            plantoesQuery.refetch();
            ausenciasQuery.refetch();
            folgasQuery.refetch();
          }}
        />
      </PageShell>
    );
  }

  if (carregando) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Dashboard" description="Seus próximos plantões, ausências e folgas em um só lugar." />

      <div className="flex flex-col gap-4 sm:flex-row">
        <KpiTile label="Próximo plantão" valor={proximosPlantoes[0]?.data.slice(0, 10) ?? '—'} />
        <KpiTile label="Ausências aprovadas" valor={String(proximasAusencias.length)} />
        <KpiTile label="Folgas agendadas" valor={String(proximasFolgas.length)} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <h2 className="font-bricolage text-[24px] font-bold leading-8 tracking-[-0.4px] text-[var(--color-text-primary)]">
            Próximos plantões
          </h2>
          <Card elevated className="mt-3 overflow-hidden p-2">
            {proximosPlantoes.length === 0 ? (
              <EmptyState title="Nenhum plantão agendado" description="Você não tem plantões futuros publicados." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Data</Th>
                    <Th>Nome</Th>
                  </tr>
                </thead>
                <tbody>
                  {proximosPlantoes.map((plantao) => (
                    <Tr key={plantao.id}>
                      <Td className="font-bold text-[var(--color-text-primary)]">{plantao.data.slice(0, 10)}</Td>
                      <Td>{plantao.nome ?? '—'}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </section>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <CardTitle>Próximas ausências e acordos</CardTitle>
            <ListaResumo
              itens={proximasAusencias.map((item) => ({
                chave: item.id,
                titulo: item.tipo.nome,
                subtitulo: `${item.dataInicio.slice(0, 10)}${item.dataFim ? ` a ${item.dataFim.slice(0, 10)}` : ''}`,
              }))}
              vazio="Nenhuma ausência aprovada futura."
            />
          </Card>

          <Card className="p-6">
            <CardTitle>Próximas folgas</CardTitle>
            <ListaResumo
              itens={proximasFolgas.map((item) => ({
                chave: item.id,
                titulo: item.tipo.nome,
                subtitulo: `${item.dataInicio.slice(0, 10)}${item.dataFim ? ` a ${item.dataFim.slice(0, 10)}` : ''}`,
              }))}
              vazio="Nenhuma folga agendada."
            />
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
