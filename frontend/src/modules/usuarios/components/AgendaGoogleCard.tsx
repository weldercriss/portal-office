import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import {
  definirPreferenciaAgendaGoogle,
  desconectarAgendaGoogle,
  getStatusAgendaGoogle,
  iniciarConexaoAgendaGoogle,
} from '../api/agenda-google.api';

const STATUS_KEY = ['agenda-google', 'status'] as const;

const MOTIVOS: Record<string, string> = {
  recusado: 'A autorização não foi concluída no Google.',
  estado_invalido: 'A tentativa de conexão expirou ou veio de outro navegador. Tente novamente.',
  conta_diferente: 'A conta Google autorizada precisa ser a mesma do seu cadastro no portal.',
  usuario_inativo: 'Seu usuário não está ativo no portal.',
  permissao_incompleta: 'É preciso permitir o acesso aos eventos da agenda para sincronizar os plantões.',
  sem_token: 'O Google não devolveu uma autorização utilizável. Tente conectar novamente.',
};

/** Lê e limpa o parâmetro deixado pelo retorno do Google. */
function lerRetorno(): string | null {
  const parametros = new URLSearchParams(window.location.search);
  const retorno = parametros.get('agendaGoogle');
  if (!retorno) return null;

  const motivo = parametros.get('motivo');
  parametros.delete('agendaGoogle');
  parametros.delete('motivo');
  const busca = parametros.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${busca ? `?${busca}` : ''}`);

  // O parâmetro não prova nada: o estado real vem do status do backend.
  return retorno === 'conectada' ? 'conectada' : (motivo ?? 'falha');
}

/**
 * Autorização individual da Agenda Google. Cada pessoa conecta a própria conta;
 * o portal só escreve nos eventos de plantão dela. Some quando a integração
 * está desligada no servidor, para não prometer o que não existe.
 */
export function AgendaGoogleCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: STATUS_KEY, queryFn: getStatusAgendaGoogle, retry: false });
  const [retorno, setRetorno] = useState<string | null>(null);

  useEffect(() => {
    const resultado = lerRetorno();
    if (!resultado) return;
    setRetorno(resultado);
    void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
  }, [queryClient]);

  const aplicarStatus = { onSuccess: (status: unknown) => queryClient.setQueryData(STATUS_KEY, status) };
  const preferencia = useMutation({ mutationFn: definirPreferenciaAgendaGoogle, ...aplicarStatus });
  const desconexao = useMutation({ mutationFn: desconectarAgendaGoogle, ...aplicarStatus });
  const conexao = useMutation({
    mutationFn: iniciarConexaoAgendaGoogle,
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const status = statusQuery.data;
  if (!status?.habilitado) return null;

  const conectada = status.conexao === 'CONECTADA';
  const conectando = conexao.isPending || conexao.isSuccess;

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-6">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        Agenda Google
      </h2>

      {conectada ? (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-md space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[var(--color-success)]" />
                Conectada como {status.googleEmail}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Seus plantões publicados aparecem na sua Agenda Google e são atualizados quando a escala muda.
                Desligar a sincronização remove os eventos já criados.
              </p>
            </div>
            <StatusToggle
              checked={status.ativa}
              onChange={(ativa) => preferencia.mutate(ativa)}
              label="Sincronizar plantões com a Agenda Google"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" size="sm" onClick={() => desconexao.mutate()} disabled={desconexao.isPending}>
              Desconectar
            </Button>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Desconectar apaga a autorização guardada aqui, mas mantém os eventos já criados. Para removê-los, desligue
              a sincronização e aguarde a limpeza antes de desconectar.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="max-w-xl text-sm text-[var(--color-text-secondary)]">
            {status.conexao === 'RECONECTAR'
              ? 'A autorização da sua Agenda Google não vale mais. Reconecte para voltar a sincronizar os plantões.'
              : 'Conecte sua conta Google para que seus plantões publicados apareçam automaticamente na sua agenda.'}
          </p>
          <Button onClick={() => conexao.mutate()} disabled={conectando}>
            {conectando && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {status.conexao === 'RECONECTAR' ? 'Reconectar Agenda Google' : 'Conectar Agenda Google'}
          </Button>
        </div>
      )}

      {status.limpezaPendente && (
        <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
          Os eventos criados pelo portal ainda estão sendo removidos da sua agenda.
        </p>
      )}

      {retorno && retorno !== 'conectada' && (
        <p className="mt-3 flex items-start gap-2 text-sm font-medium text-[var(--color-danger)]">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {MOTIVOS[retorno] ?? 'Não foi possível concluir a conexão. Tente novamente.'}
        </p>
      )}

      {conexao.isError && (
        <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">
          Não foi possível iniciar a conexão. Tente novamente.
        </p>
      )}

      {(preferencia.isError || desconexao.isError) && (
        <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">
          Não foi possível salvar a alteração. Tente novamente.
        </p>
      )}
    </div>
  );
}
