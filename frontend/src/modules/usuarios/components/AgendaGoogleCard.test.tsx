import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaGoogleCard } from './AgendaGoogleCard';
import type { StatusAgendaGoogle } from '../api/agenda-google.api';

const CONECTADA: StatusAgendaGoogle = {
  habilitado: true,
  ativa: true,
  conexao: 'CONECTADA',
  googleEmail: 'ana@empresa.com',
  limpezaPendente: false,
};

const NAO_CONECTADA: StatusAgendaGoogle = {
  habilitado: true,
  ativa: true,
  conexao: 'NAO_CONECTADA',
  googleEmail: null,
  limpezaPendente: false,
};

function mockFetch(status: StatusAgendaGoogle) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const alvo = String(url);
    if (alvo.endsWith('/agenda-google/status')) {
      return new Response(JSON.stringify(status), { status: 200 });
    }
    if (alvo.endsWith('/agenda-google/preferencia')) {
      const corpo = JSON.parse(String(init?.body)) as { ativa: boolean };
      return new Response(JSON.stringify({ ...status, ativa: corpo.ativa }), { status: 200 });
    }
    if (alvo.endsWith('/agenda-google/oauth/iniciar')) {
      return new Response(JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth?fake' }), { status: 200 });
    }
    if (alvo.endsWith('/agenda-google/conexao')) {
      return new Response(JSON.stringify({ ...NAO_CONECTADA, ativa: status.ativa }), { status: 200 });
    }
    throw new Error(`Rota não mapeada: ${alvo}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AgendaGoogleCard />
    </QueryClientProvider>,
  );
}

const ROTULO = 'Sincronizar plantões com a Agenda Google';

describe('AgendaGoogleCard', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/perfil');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('não aparece quando a integração está desligada no servidor', async () => {
    mockFetch({ ...NAO_CONECTADA, habilitado: false });
    renderCard();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByText('Agenda Google')).not.toBeInTheDocument();
  });

  it('oferece a conexão para quem ainda não autorizou', async () => {
    mockFetch(NAO_CONECTADA);
    renderCard();

    expect(await screen.findByRole('button', { name: 'Conectar Agenda Google' })).toBeInTheDocument();
    expect(screen.queryByLabelText(ROTULO)).not.toBeInTheDocument();
  });

  it('leva o navegador à URL de consentimento devolvida pelo backend', async () => {
    const fetchMock = mockFetch(NAO_CONECTADA);
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Conectar Agenda Google' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/agenda-google/oauth/iniciar'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?fake'));
  });

  it('mostra a conta autorizada e a chave ligada', async () => {
    mockFetch(CONECTADA);
    renderCard();

    expect(await screen.findByText(/ana@empresa.com/)).toBeInTheDocument();
    expect(await screen.findByLabelText(ROTULO)).toBeChecked();
  });

  it('desliga a sincronização pela chave', async () => {
    const fetchMock = mockFetch(CONECTADA);
    renderCard();

    await userEvent.click(await screen.findByLabelText(ROTULO));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/agenda-google/preferencia'),
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ ativa: false }) }),
      ),
    );
    await waitFor(() => expect(screen.getByLabelText(ROTULO)).not.toBeChecked());
  });

  it('desconecta e volta a oferecer a conexão', async () => {
    const fetchMock = mockFetch(CONECTADA);
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Desconectar' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/agenda-google/conexao'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    expect(await screen.findByRole('button', { name: 'Conectar Agenda Google' })).toBeInTheDocument();
  });

  it('pede reconexão quando a autorização foi perdida', async () => {
    mockFetch({ ...CONECTADA, conexao: 'RECONECTAR' });
    renderCard();

    expect(await screen.findByRole('button', { name: 'Reconectar Agenda Google' })).toBeInTheDocument();
    expect(await screen.findByText(/não vale mais/)).toBeInTheDocument();
  });

  it('avisa que a limpeza dos eventos está em andamento', async () => {
    mockFetch({ ...CONECTADA, ativa: false, limpezaPendente: true });
    renderCard();

    expect(await screen.findByText(/ainda estão sendo removidos/)).toBeInTheDocument();
  });

  it('explica a recusa do retorno e limpa o parâmetro da URL', async () => {
    window.history.replaceState(null, '', '/perfil?agendaGoogle=erro&motivo=conta_diferente');
    mockFetch(NAO_CONECTADA);
    renderCard();

    expect(await screen.findByText(/precisa ser a mesma do seu cadastro/)).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('não trata o parâmetro de sucesso como prova de conexão', async () => {
    window.history.replaceState(null, '', '/perfil?agendaGoogle=conectada');
    mockFetch(NAO_CONECTADA);
    renderCard();

    // O status do backend continua mandando: segue oferecendo a conexão.
    expect(await screen.findByRole('button', { name: 'Conectar Agenda Google' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
});
