import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../api/httpClient';
import { AuthProvider } from '../shared/auth/AuthContext';
import type { GoogleCredentialResponse } from '../shared/auth/googleIdentity';
import LoginPage from './LoginPage';

vi.mock('../config/env', () => ({
  API_BASE_URL: 'http://api.test',
  SOCKET_URL: 'http://api.test',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
}));

const initialize = vi.fn();
const renderButton = vi.fn();
const carregarGoogleIdentity = vi.fn();

vi.mock('../shared/auth/googleIdentity', () => ({
  carregarGoogleIdentity: () => carregarGoogleIdentity(),
}));

type Resposta = { status?: number; body: unknown };

function mockFetch(rotas: Record<string, Resposta | (() => Resposta)>) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    const alvo = String(url);
    const chave = Object.keys(rotas).find((rota) => alvo.endsWith(rota));
    if (!chave) throw new Error(`Rota não mapeada: ${alvo}`);
    const rota = rotas[chave];
    const { status = 200, body } = typeof rota === 'function' ? rota() : rota;
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderLogin() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Dispara a credencial como o Google faria após a escolha da conta. */
async function dispararCredencial(credential: string) {
  await waitFor(() => expect(initialize).toHaveBeenCalled());
  const config = initialize.mock.calls.at(-1)![0] as { callback: (r: GoogleCredentialResponse) => void };
  config.callback({ credential });
}

describe('LoginPage com Google', () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
    initialize.mockClear();
    renderButton.mockClear();
    carregarGoogleIdentity.mockResolvedValue({
      initialize,
      renderButton,
      cancel: vi.fn(),
      disableAutoSelect: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('inicializa o botão com o nonce do desafio e troca a credencial pela sessão', async () => {
    const fetchMock = mockFetch({
      '/auth/google/status': { body: { habilitado: true } },
      '/auth/google/challenge': { body: { nonce: 'nonce-1', expiraEm: new Date().toISOString() } },
      '/auth/google': { body: { accessToken: 'token-123', user: { id: '1', nome: 'Ana', role: 'USER', rotinas: [] } } },
      '/users/me': { body: { id: '1', nome: 'Ana', role: 'USER', rotinas: [] } },
    });

    renderLogin();
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'nonce-1', auto_select: false }));

    await dispararCredencial('credencial-google');

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/google'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      ),
    );
    await waitFor(() => expect(localStorage.getItem('@portal:token')).toBe('token-123'));
  });

  it('mostra a orientação do backend quando a conta não está vinculada', async () => {
    mockFetch({
      '/auth/google/status': { body: { habilitado: true } },
      '/auth/google/challenge': { body: { nonce: 'nonce-1', expiraEm: new Date().toISOString() } },
      '/auth/google': { status: 401, body: { message: 'Conta Google não vinculada. Entre com e-mail e senha.' } },
    });

    renderLogin();
    await dispararCredencial('credencial-google');

    expect(await screen.findByText('Conta Google não vinculada. Entre com e-mail e senha.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('emite um novo desafio após uma tentativa recusada', async () => {
    let nonce = 'nonce-1';
    mockFetch({
      '/auth/google/status': { body: { habilitado: true } },
      '/auth/google/challenge': () => ({ body: { nonce, expiraEm: new Date().toISOString() } }),
      '/auth/google': { status: 401, body: { message: 'Desafio de autenticação inválido ou expirado.' } },
    });

    renderLogin();
    await dispararCredencial('credencial-google');
    nonce = 'nonce-2';

    await waitFor(() => expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'nonce-2' })));
  });

  it('mantém o login por senha quando a integração está desligada no backend', async () => {
    mockFetch({ '/auth/google/status': { body: { habilitado: false } } });

    renderLogin();

    expect(await screen.findByText('Login com Google indisponível no momento.')).toBeInTheDocument();
    expect(renderButton).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('mantém o login por senha quando o script do Google não carrega', async () => {
    carregarGoogleIdentity.mockRejectedValue(new Error('Não foi possível carregar o Google.'));
    mockFetch({
      '/auth/google/status': { body: { habilitado: true } },
      '/auth/google/challenge': { body: { nonce: 'nonce-1', expiraEm: new Date().toISOString() } },
    });

    renderLogin();

    expect(await screen.findByText('Login com Google indisponível no momento.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
