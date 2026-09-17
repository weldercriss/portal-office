import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { HttpError } from '../api/httpClient';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/Form';
import { Input } from '../components/ui/Input';
import { BRAND_LOGO_ALT, BRAND_LOGO_DARK, BRAND_LOGO_LIGHT } from '../config/brand';
import { GOOGLE_CLIENT_ID } from '../config/env';
import { useAuth } from '../shared/auth/AuthContext';
import { GoogleSignInButton } from '../shared/auth/GoogleSignInButton';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await login(email, senha);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof HttpError) {
        setErro(err.status === 401 ? 'E-mail ou senha inválidos' : 'Erro no servidor. Tente novamente em instantes.');
      } else {
        setErro('Não foi possível conectar ao servidor. Verifique se o backend está no ar.');
      }
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Recebe a credencial do Google. O erro volta ao botão para que ele emita um
   * novo desafio antes da próxima tentativa.
   */
  async function handleGoogleCredential(credential: string) {
    setErro(null);
    setCarregando(true);
    try {
      await loginWithGoogle(credential);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof HttpError) {
        setErro(err.status >= 500 ? 'Erro no servidor. Tente novamente em instantes.' : err.message);
      } else {
        setErro('Não foi possível conectar ao servidor. Verifique se o backend está no ar.');
      }
      throw err;
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface)] lg:flex-row">
      {/* ── Formulário ───────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">


          <h1 className="font-bricolage text-[28px] font-bold leading-tight tracking-[-0.5px] text-[var(--color-text-primary)]">
            Bem-vindo ao Conexa!
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Entre para acessar sua conta.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <FormField label="E-mail" htmlFor="email">
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="username"
                  placeholder="seu@email.com"
                  className="pl-9"
                />
              </div>
            </FormField>

            <FormField label="Senha" htmlFor="senha">
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <Input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  className="px-9"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[8px] p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  {mostrarSenha ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FormField>

            {erro && (
              <p className="flex items-start gap-2 rounded-[var(--radius-button)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {erro}
              </p>
            )}

            <Button type="submit" disabled={carregando} className="mt-2 w-full">
              {carregando && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">ou</span>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <GoogleSignInButton
                finalidade="LOGIN"
                onCredential={handleGoogleCredential}
                desabilitado={carregando}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Painel de marca — o mesmo gradiente do shell ──────────────── */}
      <div className="hidden flex-1 items-center justify-center bg-gradient-rail p-12 lg:flex">
        <img src={BRAND_LOGO_LIGHT} alt={BRAND_LOGO_ALT} className="h-[150px] w-auto" />
      </div>
    </div>
  );
}
