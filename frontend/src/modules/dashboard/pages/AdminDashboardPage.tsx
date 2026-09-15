import { Link } from 'react-router-dom';
import { PageShell } from '../../../components/system/PageShell';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useResumoAdmin } from '../hooks/useDashboard';
import type { DashboardAgendamentoProximo } from '../types/dashboard.types';

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

function diasLabel(dias: number) {
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
}

/** Hoje no calendário de quem está olhando, não no fuso do servidor. */
function hojeIso(): string {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** O dia do agendamento vem em UTC do backend: comparar em UTC evita cair um dia errado. */
function labelDiaAgendamento(dataIso: string): string {
  const dia = dataIso.slice(0, 10);
  const hoje = hojeIso();
  if (dia === hoje) return 'Hoje';

  const amanha = new Date(`${hoje}T00:00:00.000Z`);
  amanha.setUTCDate(amanha.getUTCDate() + 1);
  if (dia === amanha.toISOString().slice(0, 10)) return 'Amanhã';

  return new Date(`${dia}T00:00:00.000Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
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

export default function AdminDashboardPage() {
  const resumoQuery = useResumoAdmin();

  if (resumoQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar o dashboard." onRetry={() => resumoQuery.refetch()} />
      </PageShell>
    );
  }

  if (resumoQuery.isLoading || !resumoQuery.data) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  const { totalColaboradores, porDepartamento, proximosAniversariantes, proximosAniversariosCasa, agendamentos } =
    resumoQuery.data;

  return (
    <PageShell>
      <PageHeader title="Dashboard" description="Visão geral do time e dos próximos eventos de RH." />

      <div className="flex flex-col gap-4 sm:flex-row">
        <KpiTile label="Total de colaboradores" valor={String(totalColaboradores)} />
        <KpiTile label="Próximos aniversariantes" valor={String(proximosAniversariantes.length)} />
        <KpiTile label="Próximos aniversários de casa" valor={String(proximosAniversariosCasa.length)} />
        <KpiTile label="Reservas de sala pendentes" valor={String(agendamentos.pendentes)} />
      </div>

      <Card elevated className="mt-6 p-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Próximos agendamentos</CardTitle>
          <Link to="/agendamentos" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
            Ver todos
          </Link>
        </div>
        {agendamentos.proximas.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
            Nenhuma reserva confirmada para hoje ou amanhã.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {agendamentos.proximas.map((item: DashboardAgendamentoProximo) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0"
              >
                <div>
                  <p className="font-bold text-[var(--color-text-primary)]">{item.sala}</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">{item.solicitante}</p>
                </div>
                <span className="whitespace-nowrap text-sm font-medium text-[var(--color-text-secondary)]">
                  {labelDiaAgendamento(item.data)}, {item.horaInicio} às {item.horaFim}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card elevated className="p-6">
          <CardTitle>Colaboradores por departamento</CardTitle>
          {porDepartamento.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhum colaborador cadastrado ainda.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {porDepartamento.map((item) => (
                <li
                  key={item.departamentoId ?? 'sem-departamento'}
                  className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0"
                >
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.departamento}</span>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <CardTitle>Próximos aniversários</CardTitle>
          <ListaResumo
            itens={proximosAniversariantes.map((item) => ({
              chave: item.id,
              titulo: item.nome,
              subtitulo: diasLabel(item.dias),
            }))}
            vazio="Nenhum aniversário nos próximos dias."
          />
        </Card>

        <Card className="p-6">
          <CardTitle>Próximos aniversários de casa</CardTitle>
          <ListaResumo
            itens={proximosAniversariosCasa.map((item) => ({
              chave: item.id,
              titulo: item.nome,
              subtitulo: `${diasLabel(item.dias)} — completa ${item.anos} ${item.anos === 1 ? 'ano' : 'anos'}`,
            }))}
            vazio="Nenhum aniversário de casa nos próximos dias."
          />
        </Card>
      </div>
    </PageShell>
  );
}
