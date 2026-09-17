import { Badge } from '../../../components/ui/Badge';
import { Dialog } from '../../../components/ui/Dialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { useLogAplicacaoDetalhe } from '../hooks/useLogsAplicacao';
import { RESULTADO_LOG_APLICACAO } from '../types/log-aplicacao.types';
import type { LogAplicacaoResultado } from '../types/log-aplicacao.types';

const TOM_RESULTADO: Record<LogAplicacaoResultado, 'success' | 'warning' | 'danger' | 'neutral'> = {
  SUCESSO: 'success',
  ERRO_CLIENTE: 'warning',
  ERRO_SERVIDOR: 'danger',
  ABORTADA: 'neutral',
};

const BLOCO_MONO =
  'max-h-56 overflow-x-auto whitespace-pre-wrap break-words rounded-[var(--radius-field)] bg-[var(--color-surface-hover)] p-3 font-mono text-xs text-[var(--color-text-secondary)]';

interface LogAplicacaoDetalheDialogProps {
  id: string | null;
  onOpenChange: (open: boolean) => void;
}

export function LogAplicacaoDetalheDialog({ id, onOpenChange }: LogAplicacaoDetalheDialogProps) {
  const detalheQuery = useLogAplicacaoDetalhe(id ?? undefined);
  const detalhe = detalheQuery.data;

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange} title="Detalhes da requisição" className="max-w-3xl" fitViewport>
      {detalheQuery.isLoading && <LoadingState rows={4} />}
      {detalheQuery.isError && (
        <ErrorState message="Não foi possível carregar os detalhes deste log." onRetry={() => detalheQuery.refetch()} />
      )}
      {detalhe && (
        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Request ID</p>
              <p className="break-all font-mono text-[13px] text-[var(--color-text-primary)]">{detalhe.requestId}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Resultado</p>
              <Badge tone={TOM_RESULTADO[detalhe.resultado]}>
                {RESULTADO_LOG_APLICACAO.find((opcao) => opcao.value === detalhe.resultado)?.label}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Método e rota</p>
              <p className="break-all text-[var(--color-text-primary)]">
                {detalhe.metodo} {detalhe.rota}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Status HTTP</p>
              <p className="text-[var(--color-text-primary)]">{detalhe.statusHttp}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Início</p>
              <p>{new Date(detalhe.iniciadoEm).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Duração</p>
              <p>{detalhe.duracaoMs} ms</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Usuário</p>
              <p>{detalhe.usuarioNome ?? 'Requisição pública'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Origem</p>
              <p>{detalhe.ipOrigem ?? '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Agente</p>
              <p className="break-words text-[var(--color-text-secondary)]">{detalhe.userAgent ?? '—'}</p>
            </div>
          </div>

          {detalhe.erroMensagem && (
            <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {detalhe.erroClasse ?? 'Erro'}
              </p>
              <pre className={BLOCO_MONO}>{detalhe.erroMensagem}</pre>
              {detalhe.erroDetalhes && <pre className={BLOCO_MONO}>{detalhe.erroDetalhes}</pre>}
              {detalhe.erroStack && <pre className={BLOCO_MONO}>{detalhe.erroStack}</pre>}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
