import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { RespostasFormularioDialog } from '../../solicitacoes/components/RespostasFormularioDialog';
import { useSolicitacoes } from '../../solicitacoes/hooks/useSolicitacoes';
import type { Solicitacao, SolicitacaoStatus } from '../../solicitacoes/types/solicitacao.types';
import { nomeExibidoSolicitacao } from '../../solicitacoes/utils/nomeSolicitante';
import { useTiposSolicitacao } from '../../tipos-solicitacao/hooks/useTiposSolicitacao';
import { useResumoAdmin } from '../hooks/useDashboard';
import type { DashboardAgendamentoProximo } from '../types/dashboard.types';

const LIMITE_LINHAS_FORMULARIOS = 20;

const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

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

function FormulariosCard() {
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [respostasAberta, setRespostasAberta] = useState<Solicitacao | null>(null);

  const tiposQuery = useTiposSolicitacao();
  const tiposFormulario = (tiposQuery.data ?? []).filter((tipo) => tipo.usaFormulario);

  const solicitacoesQuery = useSolicitacoes({
    tipoId: tipoFiltro || undefined,
    from: dataDe || undefined,
    to: dataAte || undefined,
  });
  const solicitacoesFormulario = (solicitacoesQuery.data ?? []).filter((item) => item.tipo.usaFormulario);

  const contagemPorTipo = Object.values(
    solicitacoesFormulario.reduce<Record<string, { tipoNome: string; total: number }>>((acc, item) => {
      const atual = acc[item.tipoId] ?? { tipoNome: item.tipo.nome, total: 0 };
      atual.total += 1;
      acc[item.tipoId] = atual;
      return acc;
    }, {}),
  );

  const linhas = solicitacoesFormulario.slice(0, LIMITE_LINHAS_FORMULARIOS);

  return (
    <Card elevated className="mt-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Formulários preenchidos</CardTitle>
        <Link to="/solicitacoes" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
          Ver todos
        </Link>
      </div>

      {tiposFormulario.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhum tipo de solicitação usa formulário ainda.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <Select
              aria-label="Filtrar formulários por tipo"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="max-w-[200px]"
            >
              <option value="">Todos os tipos</option>
              {tiposFormulario.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              aria-label="Data de início do filtro"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
              className="max-w-[160px]"
            />
            <Input
              type="date"
              aria-label="Data de fim do filtro"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
              className="max-w-[160px]"
            />
          </div>

          <ul className="mt-4 flex flex-wrap gap-4">
            {contagemPorTipo.map((item) => (
              <li key={item.tipoNome} className="rounded-[var(--radius-field)] border border-[var(--color-border)] px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{item.tipoNome}</p>
                <p className="font-bricolage text-lg font-bold text-[var(--color-text-primary)]">{item.total}</p>
              </li>
            ))}
          </ul>

          {linhas.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhuma resposta de formulário no filtro atual.</p>
          ) : (
            <Table className="mt-4">
              <thead>
                <tr>
                  <Th>Colaborador</Th>
                  <Th>Tipo</Th>
                  <Th>Data</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-bold text-[var(--color-text-primary)]">{nomeExibidoSolicitacao(item)}</Td>
                    <Td>{item.tipo.nome}</Td>
                    <Td>{item.dataInicio.slice(0, 10)}</Td>
                    <Td>{STATUS_LABEL[item.status]}</Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setRespostasAberta(item)}>
                        Ver respostas
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          {solicitacoesFormulario.length > LIMITE_LINHAS_FORMULARIOS && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Mostrando {LIMITE_LINHAS_FORMULARIOS} de {solicitacoesFormulario.length} —{' '}
              <Link to="/solicitacoes" className="font-bold text-[var(--color-primary)] hover:underline">
                ver todos
              </Link>
              .
            </p>
          )}
        </>
      )}

      <RespostasFormularioDialog solicitacao={respostasAberta} onOpenChange={(open) => !open && setRespostasAberta(null)} />
    </Card>
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

  const { totalColaboradores, proximosAniversariantes, proximosAniversariosCasa, agendamentos } = resumoQuery.data;

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description="Visão geral do time e dos próximos eventos de RH."
        actions={
          <Link to="/relatorios/colaboradores" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
            Ver relatório completo
          </Link>
        }
      />

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

      <FormulariosCard />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
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
