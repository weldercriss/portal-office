import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PesquisasPage from './PesquisasPage';
import type { Pesquisa } from '../types/pesquisa.types';

const PESQUISA: Pesquisa = {
  id: 'p1',
  titulo: 'NPS Setembro',
  descricao: 'Sua opinião sobre o time.',
  tipo: 'NPS',
  ativa: true,
  campos: [{ id: 'nota', label: 'Nota de 0 a 10', tipo: 'NUMERO', obrigatorio: true }],
  criadoPor: { id: 'admin1', nome: 'Admin' },
  criadoEm: '2026-09-01T00:00:00.000Z',
};

let pendentes: Pesquisa[] = [PESQUISA];
const responderMutation = { mutateAsync: vi.fn().mockResolvedValue({ ok: true }), isPending: false };

vi.mock('../hooks/usePesquisas', () => ({
  usePesquisasPendentes: () => ({ data: pendentes, isLoading: false, isError: false, refetch: vi.fn() }),
  useResponderPesquisa: () => responderMutation,
}));

describe('PesquisasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendentes = [PESQUISA];
  });

  it('lista as pesquisas pendentes do colaborador', () => {
    render(<PesquisasPage />);
    expect(screen.getByText('NPS Setembro')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há pesquisas pendentes', () => {
    pendentes = [];
    render(<PesquisasPage />);
    expect(screen.getByText('Nenhuma pesquisa pendente')).toBeInTheDocument();
  });

  it('responde a pesquisa e confirma o envio anônimo', async () => {
    render(<PesquisasPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    await userEvent.type(screen.getByLabelText('Nota de 0 a 10 *'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));

    expect(responderMutation.mutateAsync).toHaveBeenCalledWith({ id: 'p1', input: { respostas: { nota: '9' } } });
    expect(await screen.findByText(/Resposta enviada/)).toBeInTheDocument();
  });
});
