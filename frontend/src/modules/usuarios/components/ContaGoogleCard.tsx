import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { HttpError } from '../../../api/httpClient';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { GOOGLE_CLIENT_ID } from '../../../config/env';
import { GoogleSignInButton } from '../../../shared/auth/GoogleSignInButton';
import { vincularContaGoogle } from '../../../shared/auth/google.api';

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

/**
 * Área de vínculo da conta Google. O vínculo exige a confirmação da senha atual
 * e a mesma conta de e-mail do cadastro; nada é criado automaticamente.
 */
export function ContaGoogleCard({ email, googleLinkedAt }: { email: string; googleLinkedAt: string | null }) {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!GOOGLE_CLIENT_ID) return null;

  function abrirDialog() {
    setSenha('');
    setErro('');
    setDialogAberto(true);
  }

  async function handleCredential(credential: string) {
    if (senha.length < 6) {
      setErro('Confirme sua senha atual antes de escolher a conta Google.');
      throw new Error('senha ausente');
    }
    setErro('');
    setSalvando(true);
    try {
      await vincularContaGoogle({ credential, senha });
      await queryClient.invalidateQueries({ queryKey: ['usuarios', 'me'] });
      setDialogAberto(false);
      setSenha('');
    } catch (err) {
      if (err instanceof HttpError) setErro(err.message);
      else setErro('Não foi possível vincular a conta. Tente novamente.');
      throw err;
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Conta Google</h2>

      {googleLinkedAt ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
          <span>
            <strong className="text-[var(--color-text-primary)]">{email}</strong> vinculado em{' '}
            {formatarDataHora(googleLinkedAt)}. Você já pode entrar no portal com o botão do Google.
          </span>
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-start gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Vincule sua conta Google <strong className="text-[var(--color-text-primary)]">{email}</strong> para entrar
            sem digitar a senha. O login por senha continua disponível.
          </p>
          <Button type="button" onClick={abrirDialog}>
            Vincular Google
          </Button>
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto} title="Vincular conta Google">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Confirme sua senha atual e escolha a conta Google <strong>{email}</strong>. Contas com outro e-mail não são
            aceitas.
          </p>

          <FormField label="Senha atual" htmlFor="senha-vinculo-google">
            <Input
              id="senha-vinculo-google"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              minLength={6}
              autoComplete="current-password"
            />
          </FormField>

          {erro && (
            <p className="flex items-start gap-2 rounded-[var(--radius-button)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {erro}
            </p>
          )}

          <GoogleSignInButton
            finalidade="VINCULO"
            texto="continue_with"
            onCredential={handleCredential}
            desabilitado={salvando || senha.length < 6}
          />
        </div>
      </Dialog>
    </>
  );
}
