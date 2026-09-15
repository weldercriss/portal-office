import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleCredentialResponse } from '../../../shared/auth/googleIdentity';
import { ContaGoogleCard } from './ContaGoogleCard';

vi.mock('../../../config/env', () => ({
  API_BASE_URL: 'http://api.test',
  SOCKET_URL: 'http://api.test',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
}));

const initialize = vi.fn();
const renderButton = vi.fn();

vi.mock('../../../shared/auth/googleIdentity', () => ({
  carregarGoogleIdentity: () =>
    Promise.resolve({ initialize, renderButton, cancel: vi.fn(), disableAutoSelect: vi.fn() }),
}));

function mockFetch(vinculo: { status?: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    const alvo = String(url);
    if (alvo.endsWith('/auth/google/status')) return new Response(JSON.stringify({ habilitado: true }), { status: 200 });
    if (alvo.endsWith('/auth/google/challenge')) {
      return new Response(JSON.stringify({ nonce: 'nonce-1', expiraEm: new Date().toISOString() }), { status: 200 });
    }
    if (alvo.endsWith('/auth/google/link')) {
      return new Response(JSON.stringify(vinculo.body), { status: vinculo.status ?? 200 });
    }
    throw new Error(`Rota não mapeada: ${alvo}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderCard(googleLinkedAt: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ContaGoogleCard email="ana@empresa.com" googleLinkedAt={googleLinkedAt} />
    </QueryClientProvider>,
  );
}

async function dispararCredencial(credential: string) {
  await waitFor(() => expect(initialize).toHaveBeenCalled());
  const config = initialize.mock.calls.at(-1)![0] as { callback: (r: GoogleCredentialResponse) => void };
  config.callback({ credential });
}

describe('ContaGoogleCard', () => {
  beforeEach(() => {
    initialize.mockClear();
    renderButton.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra a conta já vinculada', () => {
    mockFetch({ body: {} });
    renderCard('2026-09-09T12:00:00.000Z');
    expect(screen.getByText(/vinculado em/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vincular Google' })).not.toBeInTheDocument();
  });

  it('vincula a conta enviando credencial e senha atual', async () => {
    const fetchMock = mockFetch({ body: { email: 'ana@empresa.com', googleLinkedAt: '2026-09-09T12:00:00.000Z' } });
    renderCard(null);

    await userEvent.click(screen.getByRole('button', { name: 'Vincular Google' }));
    await userEvent.type(screen.getByLabelText('Senha atual'), 'senha123');
    await dispararCredencial('credencial-google');

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/google/link'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ credential: 'credencial-google', senha: 'senha123' }),
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('exibe o motivo da recusa do backend', async () => {
    mockFetch({ status: 403, body: { message: 'A conta Google precisa usar o mesmo e-mail do cadastro.' } });
    renderCard(null);

    await userEvent.click(screen.getByRole('button', { name: 'Vincular Google' }));
    await userEvent.type(screen.getByLabelText('Senha atual'), 'senha123');
    await dispararCredencial('credencial-google');

    expect(await screen.findByText('A conta Google precisa usar o mesmo e-mail do cadastro.')).toBeInTheDocument();
  });

  it('cobra a senha antes de aceitar a conta Google', async () => {
    const fetchMock = mockFetch({ body: {} });
    renderCard(null);

    await userEvent.click(screen.getByRole('button', { name: 'Vincular Google' }));
    await dispararCredencial('credencial-google');

    expect(
      await screen.findByText('Confirme sua senha atual antes de escolher a conta Google.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/auth/google/link'), expect.anything());
  });
});
