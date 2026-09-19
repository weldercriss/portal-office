import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageShell } from '../../../components/system/PageShell';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useResultadoPesquisa } from '../hooks/usePesquisas';
import { TIPOS_PESQUISA, type AgregadoCampoPesquisa } from '../types/pesquisa.types';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 13,
  },
  labelStyle: { color: 'var(--color-text-primary)', fontWeight: 700 },
} as const;

function CampoSelecao({ campo }: { campo: AgregadoCampoPesquisa }) {
  const dados = campo.contagemOpcoes ?? [];
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="opcao" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} {...TOOLTIP_STYLE} />
          <Bar dataKey="total" name="Respostas" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CampoAgregado({ campo }: { campo: AgregadoCampoPesquisa }) {
  return (
    <Card elevated className="p-6">
      <CardTitle>{campo.label}</CardTitle>
      {campo.tipo === 'SELECAO' && <div className="mt-4">{<CampoSelecao campo={campo} />}</div>}
      {campo.tipo === 'NUMERO' && (
        <div className="mt-4">
          <p className="text-3xl font-bold text-[var(--color-text-primary)]">{campo.media?.toFixed(1) ?? '—'}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Média de {campo.valores?.length ?? 0} resposta(s)</p>
        </div>
      )}
      {(campo.tipo === 'TEXTO' || campo.tipo === 'DATA') && (
        <ul className="mt-4 flex flex-col gap-2">
          {(campo.valores ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma resposta ainda.</p>
          ) : (
            (campo.valores ?? []).map((valor, index) => (
              <li key={index} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                {valor}
              </li>
            ))
          )}
        </ul>
      )}
    </Card>
  );
}

export default function PesquisaResultadoPage() {
  const { id } = useParams<{ id: string }>();
  const resultadoQuery = useResultadoPesquisa(id);

  if (resultadoQuery.isError) {
    return <ErrorState message="Não foi possível carregar o resultado da pesquisa." onRetry={() => resultadoQuery.refetch()} />;
  }
  if (resultadoQuery.isLoading || !resultadoQuery.data) {
    return <LoadingState rows={4} />;
  }

  const { pesquisa, totalConvites, totalRespondidas, percentualRespondido, agregados } = resultadoQuery.data;

  return (
    <PageShell>
      <PageHeader
        title={pesquisa.titulo}
        description={`${TIPOS_PESQUISA.find((opcao) => opcao.value === pesquisa.tipo)?.label ?? pesquisa.tipo}${pesquisa.descricao ? ` — ${pesquisa.descricao}` : ''}`}
      />

      <Card elevated className="p-6">
        <p className="text-3xl font-bold text-[var(--color-text-primary)]">{percentualRespondido}%</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {totalRespondidas} de {totalConvites} convidado(s) responderam. As respostas são anônimas — nenhuma pergunta identifica quem respondeu.
        </p>
      </Card>

      <div className="mt-6 flex flex-col gap-6">
        {agregados.map((campo) => (
          <CampoAgregado key={campo.campoId} campo={campo} />
        ))}
      </div>
    </PageShell>
  );
}
