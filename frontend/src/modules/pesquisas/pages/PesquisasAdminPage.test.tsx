import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PesquisasAdminPage from './PesquisasAdminPage';
import type { Pesquisa } from '../types/pesquisa.types';

const PESQUISA_ATIVA: Pesquisa = {
  id: 'p1',
  titulo: 'NPS Setembro',
  descricao: null,
  tipo: 'NPS',
  ativa: true,
  campos: [],
  criadoPor: { id: 'admin1', nome: 'Admin' },
  criadoEm: '2026-09-01T00:00:00.000Z',
  _count: { convites: 4, respostas: 2 },
};

let pesquisas: Pesquisa[] = [PESQUISA_ATIVA];
const encerrarMutation = { mutate: vi.fn(), isPending: false };
const deleteMutation = { mutate: vi.fn(), isPending: false };

vi.mock('../hooks/usePesquisas', () => ({
  usePesquisas: () => ({ data: pesquisas, isLoading: false, isError: false, refetch: vi.fn() }),
  useEncerrarPesquisa: () => encerrarMutation,
  useDeletePesquisa: () => deleteMutation,
  useCreatePesquisa: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../usuarios/hooks/useUsuarios', () => ({ useUsuarios: () => ({ data: [], isLoading: false }) }));

let papel: 'ADMIN' | 'MASTER' = 'ADMIN';
vi.mock('../../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin1', nome: 'Admin', email: 'admin@suri.com', role: papel, rotinas: [] } }),
}));

vi.mock('../../tipos-solicitacao/hooks/useTemplatesFormulario', () => ({
  useTemplatesFormulario: () => ({ data: [] }),
  useCreateTemplateFormulario: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('PesquisasAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pesquisas = [PESQUISA_ATIVA];
    papel = 'ADMIN';
  });

  it('mostra o percentual de respondidas e permite encerrar uma pesquisa ativa', async () => {
    render(<PesquisasAdminPage />, { wrapper: MemoryRouter });
    expect(screen.getByText('2/4 (50%)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(encerrarMutation.mutate).toHaveBeenCalledWith('p1');
  });

  it('não oferece encerrar uma pesquisa já encerrada', () => {
    pesquisas = [{ ...PESQUISA_ATIVA, ativa: false }];
    render(<PesquisasAdminPage />, { wrapper: MemoryRouter });
    expect(screen.queryByRole('button', { name: 'Encerrar' })).not.toBeInTheDocument();
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
  });

  it('só oferece excluir para MASTER, e exclui após confirmar', async () => {
    render(<PesquisasAdminPage />, { wrapper: MemoryRouter });
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();

    papel = 'MASTER';
    render(<PesquisasAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir permanentemente' }));
    expect(deleteMutation.mutate).toHaveBeenCalledWith('p1', expect.anything());
  });
});
