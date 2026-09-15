import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SvgIcon } from '../../../components/system/SvgIcon';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions } from '../../../components/ui/Form';
import {
  useContagemNaoLidas,
  useLimparNotificacoes,
  useMarcarComoLida,
  useMarcarTodasComoLidas,
  useNotificacoes,
} from '../hooks/useNotificacoes';
import { useNotificacoesSocket } from '../hooks/useNotificacoesSocket';
import type { Notificacao } from '../types/notificacao.types';

export function NotificationBell() {
  useNotificacoesSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const notificacoesQuery = useNotificacoes();
  const contagemQuery = useContagemNaoLidas();
  const marcarComoLidaMutation = useMarcarComoLida();
  const marcarTodasMutation = useMarcarTodasComoLidas();
  const limparMutation = useLimparNotificacoes();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const total = contagemQuery.data?.total ?? 0;
  const notificacoes = notificacoesQuery.data ?? [];

  function handleClickNotificacao(notificacao: Notificacao) {
    if (!notificacao.lida) marcarComoLidaMutation.mutate(notificacao.id);
    setIsOpen(false);
    if (notificacao.link) navigate(notificacao.link);
  }

  function confirmarLimpar() {
    limparMutation.mutate(undefined, { onSuccess: () => setConfirmarLimpeza(false) });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <SvgIcon name="bell" className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--shell-header-bg)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-80 flex-col rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-elegant">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Notificações</span>
            <div className="flex items-center gap-3">
              {total > 0 && (
                <button
                  type="button"
                  onClick={() => marcarTodasMutation.mutate()}
                  className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                >
                  Marcar todas como lidas
                </button>
              )}
              {notificacoes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmarLimpeza(true)}
                  className="text-xs font-bold text-[var(--color-danger)] hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">Nenhuma notificação por aqui.</p>
            ) : (
              notificacoes.map((notificacao) => (
                <button
                  key={notificacao.id}
                  type="button"
                  onClick={() => handleClickNotificacao(notificacao)}
                  className={`flex w-full flex-col gap-0.5 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--color-surface-hover)] ${
                    notificacao.lida ? '' : 'bg-[var(--color-accent-soft)]/40'
                  }`}
                >
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">{notificacao.titulo}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{notificacao.mensagem}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <Dialog
        open={confirmarLimpeza}
        onOpenChange={setConfirmarLimpeza}
        title="Limpar notificações"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Apagar todas as suas notificações? Essa ação não pode ser desfeita.
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmarLimpeza(false)}
              disabled={limparMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarLimpar} disabled={limparMutation.isPending}>
              {limparMutation.isPending ? 'Limpando...' : 'Limpar'}
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </div>
  );
}
