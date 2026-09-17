import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogsAplicacaoPage from './LogsAplicacaoPage';
import type { LogAplicacaoDetalhe, LogAplicacaoResumo, LogsAplicacaoResposta } from '../types/log-aplicacao.types';

const LOG_SUCESSO: LogAplicacaoResumo = {
  id: 'log1',
  requestId: 'req-1',
  ciclo: 3,
  sequencia: 42,
  resultado: 'SUCESSO',
  metodo: 'GET',
  rota: '/plantoes',
  statusHttp: 200,
  duracaoMs: 12,
  finalizadoEm: '2026-09-17T10:00:00.000Z',
  usuarioId: 'user1',
  usuarioNome: 'Ana Lima',
  usuarioEmail: 'ana@suri.com',
};

const LOG_ERRO: LogAplicacaoResumo = {
  id: 'log2',
  requestId: 'req-2',
  ciclo: 3,
  sequencia: 43,
  resultado: 'ERRO_SERVIDOR',
  metodo: 'POST',
  rota: '/plantoes/:id',
  statusHttp: 500,
  duracaoMs: 340,
  finalizadoEm: '2026-09-17T10:01:00.000Z',
  usuarioId: null,
  usuarioNome: null,
  usuarioEmail: null,
};

const RESPOSTA_PADRAO: LogsAplicacaoResposta = { ciclo: 3, quantidade: 42, limite: 100, logs: [LOG_SUCESSO, LOG_ERRO] };

const DETALHE_ERRO: LogAplicacaoDetalhe = {
  ...LOG_ERRO,
  iniciadoEm: '2026-09-17T10:00:59.500Z',
  ipOrigem: '10.0.0.5',
  userAgent: 'jest-agent/1.0',
  erroClasse: 'InternalServerErrorException',
  erroMensagem: 'Falha inesperada',
  erroStack: 'Error: Falha inesperada\n at algumLugar',
  erroDetalhes: null,
};

let resposta: LogsAplicacaoResposta | undefined = RESPOSTA_PADRAO;
let carregando = false;
let comErro = false;
const refetchMock = vi.fn();
const logsQueryMock = vi.fn();

vi.mock('../hooks/useLogsAplicacao', () => ({
  useLogsAplicacao: (filtros: unknown) => {
    logsQueryMock(filtros);
    return { data: resposta, isLoading: carregando, isError: comErro, isFetching: false, refetch: refetchMock };
  },
  useLogAplicacaoDetalhe: (id: string | undefined) => ({
    data: id ? DETALHE_ERRO : undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({ data: [{ id: 'user1', nome: 'Ana Lima' }], isLoading: false, isError: false }),
}));

describe('LogsAplicacaoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resposta = RESPOSTA_PADRAO;
    carregando = false;
    comErro = false;
  });

  it('mostra o contador do ciclo e a lista de logs', () => {
    render(<LogsAplicacaoPage />);
    const tabela = within(screen.getByRole('table'));
    expect(screen.getByText('Ciclo 3 — 42 de 100 requisições')).toBeInTheDocument();
    expect(tabela.getByText('Ana Lima')).toBeInTheDocument();
    expect(tabela.getByText('/plantoes')).toBeInTheDocument();
    expect(tabela.getByText('500')).toBeInTheDocument();
  });

  it('mostra o estado de carregamento', () => {
    carregando = true;
    resposta = undefined;
    render(<LogsAplicacaoPage />);
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('mostra erro com opção de tentar novamente', async () => {
    comErro = true;
    resposta = undefined;
    render(<LogsAplicacaoPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetchMock).toHaveBeenCalled();
  });

  it('mostra estado vazio quando não há logs no ciclo', () => {
    resposta = { ciclo: 1, quantidade: 0, limite: 100, logs: [] };
    render(<LogsAplicacaoPage />);
    expect(screen.getByText('Nenhum log encontrado')).toBeInTheDocument();
  });

  it('aplica o filtro de resultado na consulta', async () => {
    render(<LogsAplicacaoPage />);
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por resultado'), 'ERRO_SERVIDOR');
    expect(logsQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ resultado: 'ERRO_SERVIDOR' }));
  });

  it('abre o detalhe com mensagem e stack do erro ao clicar em Detalhes', async () => {
    render(<LogsAplicacaoPage />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Detalhes' })[1]);
    const dialog = screen.getByRole('dialog', { name: 'Detalhes da requisição' });
    expect(within(dialog).getByText('Falha inesperada')).toBeInTheDocument();
    expect(within(dialog).getByText(/algumLugar/)).toBeInTheDocument();
  });

  it('chama refetch ao clicar em Atualizar', async () => {
    render(<LogsAplicacaoPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(refetchMock).toHaveBeenCalled();
  });
});
