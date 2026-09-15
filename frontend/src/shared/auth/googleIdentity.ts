const GSI_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleCredentialResponse {
  credential?: string;
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  cancel(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let carregamento: Promise<GoogleAccountsId> | null = null;

/**
 * Carrega o Google Identity Services sob demanda. A falha é propagada para que a
 * tela continue oferecendo o login por senha.
 */
export function carregarGoogleIdentity(): Promise<GoogleAccountsId> {
  const jaCarregado = window.google?.accounts?.id;
  if (jaCarregado) return Promise.resolve(jaCarregado);
  if (carregamento) return carregamento;

  carregamento = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    const script = existente ?? document.createElement('script');

    function concluir() {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else falhar();
    }

    function falhar() {
      carregamento = null;
      reject(new Error('Não foi possível carregar o Google.'));
    }

    script.addEventListener('load', concluir);
    script.addEventListener('error', falhar);

    if (!existente) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return carregamento;
}
