import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { getLinkTelegram } from '../api/telegram.api';

/**
 * Conexão da pessoa com o bot do Telegram do portal. O Telegram só revela o chat_id
 * depois que a própria pessoa dá o primeiro passo com o bot; este link (t.me/bot?start=id)
 * é o mínimo possível: um clique, sem digitar usuário nem esperar ninguém pedir nada.
 * Some quando o bot não está configurado no servidor.
 */
export function TelegramCard({ conectado }: { conectado: boolean }) {
  const linkQuery = useQuery({
    queryKey: ['telegram', 'connect-link'],
    queryFn: getLinkTelegram,
    enabled: !conectado,
    retry: false,
  });

  if (!conectado && !linkQuery.data?.link) return null;

  return (
    <Card elevated className="p-6">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        <Send aria-hidden="true" className="h-4 w-4" />
        Telegram
      </h2>

      {conectado ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
          Conectado. Você recebe notificações do portal pelo Telegram.
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-start gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Conecte seu Telegram para receber notificações do portal (plantões, avisos etc.) direto no app.
          </p>
          <Button type="button" onClick={() => window.open(linkQuery.data!.link!, '_blank', 'noopener,noreferrer')}>
            Conectar Telegram
          </Button>
        </div>
      )}
    </Card>
  );
}
