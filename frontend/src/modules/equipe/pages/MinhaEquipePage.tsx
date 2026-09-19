import { PageShell } from '../../../components/system/PageShell';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { resolverAvatarUrl } from '../../../lib/avatarUrl';
import { STATUS_COLABORADOR } from '../../usuarios/types/usuario.types';
import { useMinhaEquipe, useResumoEquipe } from '../hooks/useEquipe';

const STATUS_LABEL = Object.fromEntries(STATUS_COLABORADOR.map((s) => [s.value, s.label]));

function diasLabel(dias: number) {
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
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

export default function MinhaEquipePage() {
  const equipeQuery = useMinhaEquipe();
  const resumoQuery = useResumoEquipe();

  if (equipeQuery.isError || resumoQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar sua equipe." onRetry={() => { equipeQuery.refetch(); resumoQuery.refetch(); }} />
      </PageShell>
    );
  }

  if (equipeQuery.isLoading || resumoQuery.isLoading || !equipeQuery.data || !resumoQuery.data) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  const liderados = equipeQuery.data;
  const resumo = resumoQuery.data;

  return (
    <PageShell>
      <PageHeader title="Minha equipe" description="Liderados diretos e os próximos eventos de RH deles." />

      <div className="flex flex-col gap-4 sm:flex-row">
        <KpiTile label="Liderados diretos" valor={String(resumo.totalLiderados)} />
        <KpiTile label="Próximos aniversariantes" valor={String(resumo.proximosAniversariantes.length)} />
        <KpiTile label="Checklist de admissão pendente" valor={String(resumo.checklistPendente)} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card elevated className="overflow-hidden">
          <div className="p-6 pb-0">
            <CardTitle>Liderados</CardTitle>
          </div>
          {liderados.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-text-secondary)]">Você ainda não tem liderados diretos.</p>
          ) : (
            <Table className="mt-4">
              <thead>
                <tr>
                  <Th>Nome</Th>
                  <Th>Cargo</Th>
                  <Th>E-mail</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {liderados.map((pessoa) => (
                  <Tr key={pessoa.id}>
                    <Td className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]">
                      {pessoa.avatarUrl ? (
                        <img src={resolverAvatarUrl(pessoa.avatarUrl)!} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-xs font-bold text-[var(--color-text-secondary)]">
                          {pessoa.nome.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      {pessoa.nome}
                    </Td>
                    <Td>{pessoa.cargo ?? '—'}</Td>
                    <Td>{pessoa.email}</Td>
                    <Td>
                      <Badge tone={pessoa.statusColaborador === 'ATIVO' ? 'success' : 'neutral'}>
                        {STATUS_LABEL[pessoa.statusColaborador]}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <CardTitle>Próximos aniversários</CardTitle>
          {resumo.proximosAniversariantes.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhum aniversário nos próximos dias.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {resumo.proximosAniversariantes.map((item) => (
                <li key={item.id} className="border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0">
                  <p className="font-bold text-[var(--color-text-primary)]">{item.nome}</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">{diasLabel(item.dias)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
