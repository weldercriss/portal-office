import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GOOGLE_CLIENT_ID } from '../../config/env';
import { criarDesafioGoogle, getGoogleStatus, type FinalidadeGoogle } from './google.api';
import { carregarGoogleIdentity } from './googleIdentity';

type Estado = 'carregando' | 'pronto' | 'indisponivel';

interface GoogleSignInButtonProps {
  finalidade: FinalidadeGoogle;
  /** Recebe o ID token do Google. Se rejeitar, um novo desafio é emitido. */
  onCredential: (credential: string) => Promise<void> | void;
  texto?: 'signin_with' | 'continue_with';
  desabilitado?: boolean;
}

/**
 * Botão oficial do Google Identity Services. Cada montagem pede um desafio ao
 * backend e o envia como `nonce`, de modo que a credencial só valha para esta
 * operação e neste navegador. Sem Client ID, ou com a integração desligada, o
 * componente some e a tela segue com o login por senha.
 */
export function GoogleSignInButton({
  finalidade,
  onCredential,
  texto = 'signin_with',
  desabilitado = false,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [estado, setEstado] = useState<Estado>(GOOGLE_CLIENT_ID ? 'carregando' : 'indisponivel');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let ativo = true;
    setEstado('carregando');

    async function preparar() {
      try {
        const { habilitado } = await getGoogleStatus();
        if (!ativo) return;
        if (!habilitado) {
          setEstado('indisponivel');
          return;
        }

        const [api, desafio] = await Promise.all([carregarGoogleIdentity(), criarDesafioGoogle(finalidade)]);
        if (!ativo || !containerRef.current) return;

        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: desafio.nonce,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (resposta) => {
            // Sem credencial significa cancelamento: basta renovar o desafio.
            if (!resposta.credential) {
              setTentativa((valor) => valor + 1);
              return;
            }
            Promise.resolve(onCredentialRef.current(resposta.credential)).catch(() => {
              if (ativo) setTentativa((valor) => valor + 1);
            });
          },
        });

        containerRef.current.innerHTML = '';
        api.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: texto,
          logo_alignment: 'center',
          width: Math.min(Math.max(containerRef.current.offsetWidth || 320, 200), 400),
        });
        setEstado('pronto');
      } catch {
        if (ativo) setEstado('indisponivel');
      }
    }

    void preparar();
    return () => {
      ativo = false;
      window.google?.accounts?.id?.cancel();
    };
  }, [finalidade, texto, tentativa]);

  if (!GOOGLE_CLIENT_ID) return null;

  if (estado === 'indisponivel') {
    return (
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        Login com Google indisponível no momento.{' '}
        <button
          type="button"
          onClick={() => setTentativa((valor) => valor + 1)}
          className="font-medium text-[var(--color-text-secondary)] underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </p>
    );
  }

  return (
    <div className={desabilitado ? 'pointer-events-none opacity-50' : undefined}>
      {estado === 'carregando' && (
        <p className="flex items-center justify-center gap-2 py-2 text-xs text-[var(--color-text-muted)]">
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          Carregando o Google...
        </p>
      )}
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
