import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../api/httpClient';
import { AuthProvider } from '../shared/auth/AuthContext';
import LoginPage from './LoginPage';

// Sem Client ID, independente do .env da máquina: este arquivo cobre o portal
// sem a integração. O login com Google tem arquivo próprio.
vi.mock('../config/env', () => ({
  API_BASE_URL: 'http://api.test',
  SOCKET_URL: 'http://api.test',
  GOOGLE_CLIENT_ID: '',
}));

function renderLogin() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function preencherEEntrar() {
  await userEvent.type(screen.getByLabelText('E-mail'), 'admin@portal-suporte.local');
  await userEvent.type(screen.getByLabelText('Senha'), 'senha123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    setAccessToken(null);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits credentials to the login endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: 'token-123', user: { id: '1', nome: 'Ana', role: 'USER' } }), {
          status: 200,
        }),
      ),
    );

    renderLogin();
    await preencherEEntrar();

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.objectContaining({ method: 'POST' })),
    );
  });

  it('shows an invalid-credentials message on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Credenciais inválidas' }), { status: 401 })),
    );

    renderLogin();
    await preencherEEntrar();

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument();
  });

  it('hides the Google option when no client id is configured', async () => {
    vi.stubGlobal('fetch', vi.fn());

    renderLogin();

    expect(screen.queryByText('Login com Google indisponível no momento.')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/google'), expect.anything());
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows a connection error when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    renderLogin();
    await preencherEEntrar();

    expect(
      await screen.findByText('Não foi possível conectar ao servidor. Verifique se o backend está no ar.'),
    ).toBeInTheDocument();
  });
});
