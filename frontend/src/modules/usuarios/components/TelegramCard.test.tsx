import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelegramCard } from './TelegramCard';
import type { LinkTelegram } from '../api/telegram.api';

function mockFetch(resposta: LinkTelegram) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    const alvo = String(url);
    if (alvo.endsWith('/telegram/connect-link')) {
      return new Response(JSON.stringify(resposta), { status: 200 });
    }
    throw new Error(`Rota não mapeada: ${alvo}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderCard(conectado: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TelegramCard conectado={conectado} />
    </QueryClientProvider>,
  );
}

describe('TelegramCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra o status conectado sem buscar link', async () => {
    const fetchMock = mockFetch({ link: 'https://t.me/portal_bot?start=abc' });
    renderCard(true);

    expect(await screen.findByText(/Conectado/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('oferece o link pessoal para quem ainda não conectou', async () => {
    mockFetch({ link: 'https://t.me/portal_bot?start=abc-123' });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { default: userEvent } = await import('@testing-library/user-event');
    renderCard(false);

    const botao = await screen.findByRole('button', { name: 'Conectar Telegram' });
    await userEvent.click(botao);

    expect(openSpy).toHaveBeenCalledWith('https://t.me/portal_bot?start=abc-123', '_blank', 'noopener,noreferrer');
  });

  it('não aparece quando o bot ainda não foi configurado', async () => {
    const fetchMock = mockFetch({ link: null, motivo: 'A integração com Telegram ainda não foi configurada pelo administrador.' });
    renderCard(false);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText('Telegram')).not.toBeInTheDocument();
  });
});
