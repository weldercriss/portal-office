import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { usePlantoesDisponiveisParaTroca, useSolicitarTroca } from '../hooks/usePlantoes';
import type { Plantao } from '../types/plantao.types';

interface TrocaDialogProps {
  plantao: Plantao | null;
  onOpenChange: (open: boolean) => void;
}

export function TrocaDialog({ plantao, onOpenChange }: TrocaDialogProps) {
  const disponiveisQuery = usePlantoesDisponiveisParaTroca(plantao?.id ?? null);
  const solicitarMutation = useSolicitarTroca();
  const [erro, setErro] = useState<string | null>(null);

  async function solicitar(destinoId: string) {
    if (!plantao) return;
    setErro(null);
    try {
      await solicitarMutation.mutateAsync({ id: plantao.id, plantaoDestinoId: destinoId });
      onOpenChange(false);
    } catch {
      setErro('Não foi possível solicitar a troca.');
    }
  }

  return (
    <Dialog open={!!plantao} onOpenChange={onOpenChange} title="Solicitar troca de plantão">
      {plantao && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Escolha um dos próximos plantões para solicitar a troca. O plantonista escolhido e os administradores
            serão notificados.
          </p>

          {disponiveisQuery.isLoading && <LoadingState rows={3} />}

          {disponiveisQuery.isError && (
            <p className="text-sm text-[var(--color-danger)]">Não foi possível carregar os plantões disponíveis.</p>
          )}

          {disponiveisQuery.isSuccess && disponiveisQuery.data.length === 0 && (
            <EmptyState
              title="Nenhum plantão disponível"
              description="Não há próximos plantões com plantonista vinculado para troca."
            />
          )}

          {disponiveisQuery.isSuccess && disponiveisQuery.data.length > 0 && (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {disponiveisQuery.data.map((candidato) => (
                <li
                  key={candidato.id}
                  className="flex items-center justify-between rounded-[var(--radius-button)] border border-[var(--color-border)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{candidato.data.slice(0, 10)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {candidato.user?.nome}
                      {candidato.turno && ` · ${candidato.turno.nome}`}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" disabled={solicitarMutation.isPending} onClick={() => solicitar(candidato.id)}>
                    Solicitar troca
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
        </div>
      )}
    </Dialog>
  );
}
