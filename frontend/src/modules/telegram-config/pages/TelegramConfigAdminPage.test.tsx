import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TelegramConfigAdminPage from './TelegramConfigAdminPage';
import type {
  TelegramConfig,
  TelegramGrupoConectado,
  TelegramGrupoDetectado,
  TelegramNotificacaoTipo,
} from '../types/telegram-config.types';

const CONFIG: TelegramConfig = { id: 'cfg1', botToken: 'test-token', ativo: true };

const TIPOS: TelegramNotificacaoTipo[] = [
  {
    id: 't1',
    tipo: 'RESERVA_SALA_CRIADA',
    nome: 'Sala reservada',
    enviar: true,
    enviarGrupo: false,
    grupoDisponivel: true,
  },
  {
    id: 't2',
    tipo: 'PLANTAO_VINCULADO',
    nome: 'Plantão vinculado',
    enviar: false,
    enviarGrupo: false,
    grupoDisponivel: false,
  },
];

const GRUPOS_DETECTADOS: TelegramGrupoDetectado[] = [
  { id: 'gd1', chatId: '-1001234', chatTitle: 'Time Ops', topicId: '42', vistoEm: new Date().toISOString() },
];

function mockFetch(gruposIniciais: TelegramGrupoConectado[]) {
  let grupos = gruposIniciais;
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const alvo = String(url);
    const metodo = init?.method ?? 'GET';

    if (alvo.endsWith('/telegram/config') && metodo === 'GET') {
      return new Response(JSON.stringify(CONFIG), { status: 200 });
    }
    if (alvo.endsWith('/telegram/tipos')) {
      return new Response(JSON.stringify(TIPOS), { status: 200 });
    }
    if (/\/telegram\/tipos\//.test(alvo) && metodo === 'PUT') {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    if (alvo.endsWith('/telegram/grupos-detectados')) {
      return new Response(JSON.stringify(GRUPOS_DETECTADOS), { status: 200 });
    }
    if (alvo.endsWith('/telegram/grupos') && metodo === 'GET') {
      return new Response(JSON.stringify(grupos), { status: 200 });
    }
    if (alvo.endsWith('/telegram/grupos') && metodo === 'POST') {
      const corpo = JSON.parse(String(init?.body));
      const novo: TelegramGrupoConectado = {
        id: `g${grupos.length + 1}`,
        chatId: corpo.chatId,
        topicId: corpo.topicId ?? '',
        nome: corpo.nome ?? null,
        criadoEm: new Date().toISOString(),
      };
      grupos = [...grupos, novo];
      return new Response(JSON.stringify(novo), { status: 200 });
    }
    if (/\/telegram\/grupos\//.test(alvo) && metodo === 'DELETE') {
      const id = alvo.split('/').pop();
      grupos = grupos.filter((g) => g.id !== id);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    throw new Error(`Rota não mapeada: ${metodo} ${alvo}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TelegramConfigAdminPage />
    </QueryClientProvider>,
  );
}

describe('TelegramConfigAdminPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra o toggle de grupo só pros tipos que suportam grupo', async () => {
    mockFetch([]);
    renderPage();

    expect(await screen.findByText('Sala reservada')).toBeInTheDocument();
    expect(screen.getByLabelText('Enviar "Sala reservada" para o grupo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Enviar "Plantão vinculado" para o grupo')).not.toBeInTheDocument();
  });

  it('detecta e conecta um grupo com um clique, sem digitar números', async () => {
    const fetchMock = mockFetch([]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Detectar automaticamente' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Usar este' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/telegram/grupos'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ chatId: '-1001234', topicId: '42', nome: 'Time Ops' }),
        }),
      ),
    );
    expect(await screen.findByText('Time Ops')).toBeInTheDocument();
  });

  it('conecta um grupo digitando o chat ID manualmente, mantendo os já conectados', async () => {
    const fetchMock = mockFetch([{ id: 'g1', chatId: '-1000001', topicId: '', nome: 'Já conectado', criadoEm: '' }]);
    renderPage();

    expect(await screen.findByText('Já conectado')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Inserir manualmente' }));
    await userEvent.type(screen.getByLabelText('Chat ID do grupo'), '-1003991505174');
    await userEvent.type(screen.getByLabelText('Topic ID (opcional)'), '42');
    await userEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/telegram/grupos'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ chatId: '-1003991505174', topicId: '42' }),
        }),
      ),
    );
    // O grupo novo entra na lista sem tirar o que já estava conectado.
    expect(await screen.findByText('Já conectado')).toBeInTheDocument();
    expect(await screen.findByText('-1003991505174')).toBeInTheDocument();
  });

  it('desconecta um grupo sem mexer nos outros', async () => {
    const fetchMock = mockFetch([
      { id: 'g1', chatId: '-1000001', topicId: '', nome: 'Time Ops', criadoEm: '' },
      { id: 'g2', chatId: '-1000002', topicId: '', nome: 'Outro time', criadoEm: '' },
    ]);
    renderPage();

    expect(await screen.findByText('Time Ops')).toBeInTheDocument();
    const linhaOps = screen.getByText('Time Ops').closest('li')!;
    await userEvent.click(within(linhaOps).getByRole('button', { name: 'Desconectar' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/telegram/grupos/g1'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    await waitFor(() => expect(screen.queryByText('Time Ops')).not.toBeInTheDocument());
    expect(screen.getByText('Outro time')).toBeInTheDocument();
  });

  it('liga o envio pessoal e o de grupo de forma independente', async () => {
    const fetchMock = mockFetch([]);
    renderPage();

    await userEvent.click(await screen.findByLabelText('Enviar "Sala reservada" para o grupo'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/telegram/tipos/RESERVA_SALA_CRIADA'),
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ enviarGrupo: true }) }),
      ),
    );
  });
});
