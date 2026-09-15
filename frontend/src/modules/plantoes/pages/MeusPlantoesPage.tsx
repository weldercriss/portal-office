import { useMemo, useState } from 'react';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { PlantaoCalendar, monthRange } from '../components/PlantaoCalendar';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuth } from '../../../shared/auth/AuthContext';
import { TrocaDialog } from '../components/TrocaDialog';
import { useAceitarTroca, usePlantoes, useRejeitarTroca, useTrocas } from '../hooks/usePlantoes';
import type { Plantao } from '../types/plantao.types';

export default function MeusPlantoesPage() {
  const { user } = useAuth();
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date());
  const plantoesQuery = usePlantoes({ status: 'PUBLICADO', ...monthRange(mesSelecionado) });
  const trocasQuery = useTrocas();
  const aceitarTrocaMutation = useAceitarTroca();
  const rejeitarTrocaMutation = useRejeitarTroca();

  const [plantaoParaTroca, setPlantaoParaTroca] = useState<Plantao | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const trocasRecebidas = useMemo(
    () => (trocasQuery.data ?? []).filter((t) => t.destinatarioId === user?.id && t.status === 'PENDENTE'),
    [trocasQuery.data, user?.id],
  );

  function handleAceitarTroca(id: string) {
    setErroAcao(null);
    aceitarTrocaMutation.mutate(id, { onError: () => setErroAcao('Não foi possível aceitar a troca.') });
  }

  function handleRejeitarTroca(id: string) {
    setErroAcao(null);
    rejeitarTrocaMutation.mutate(id, { onError: () => setErroAcao('Não foi possível rejeitar a troca.') });
  }

  if (plantoesQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar os plantões." onRetry={() => plantoesQuery.refetch()} />
      </PageShell>
    );
  }

  if (plantoesQuery.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  const plantoes = plantoesQuery.data ?? [];

  return (
    <PageShell>
      <PageHeader title="Plantões" description="Escala completa do time e seus próprios plantões." />

      {erroAcao && <p className="mb-4 text-sm text-[var(--color-danger)]">{erroAcao}</p>}

      {trocasRecebidas.length > 0 && (
        <Card elevated className="mb-6 p-6">
          <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Solicitações de troca recebidas
          </h2>
          <ul className="flex flex-col gap-3">
            {trocasRecebidas.map((troca) => (
              <li
                key={troca.id}
                className="flex flex-col gap-2 rounded-[var(--radius-button)] border border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <strong>{troca.solicitante.nome}</strong> quer trocar o plantão de{' '}
                  {troca.plantaoOrigem.data.slice(0, 10)} pelo seu plantão de {troca.plantaoDestino.data.slice(0, 10)}.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={rejeitarTrocaMutation.isPending}
                    onClick={() => handleRejeitarTroca(troca.id)}
                  >
                    Rejeitar
                  </Button>
                  <Button disabled={aceitarTrocaMutation.isPending} onClick={() => handleAceitarTroca(troca.id)}>
                    Aceitar troca
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PlantaoCalendar
        plantoes={plantoes}
        month={mesSelecionado}
        currentUserId={user?.id}
        onMonthChange={setMesSelecionado}
        onRequestSwap={setPlantaoParaTroca}
      />

      <TrocaDialog plantao={plantaoParaTroca} onOpenChange={(open) => !open && setPlantaoParaTroca(null)} />
    </PageShell>
  );
}
