import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TiposEquipamentoAdminPage from './TiposEquipamentoAdminPage';
import type { TipoEquipamento } from '../types/patrimonio.types';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const deleteMutation = { mutate: vi.fn(), isPending: false };

const tipo: TipoEquipamento = {
  id: 't1',
  nome: 'Notebook',
  descricao: null,
  exigeTermo: true,
  ativo: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
  atualizadoEm: '2026-09-01T00:00:00.000Z',
  _count: { equipamentos: 3 },
};

vi.mock('../hooks/usePatrimonio', () => ({
  useTiposEquipamento: () => ({ data: [tipo], isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateTipoEquipamento: () => createMutation,
  useUpdateTipoEquipamento: () => updateMutation,
  useDeleteTipoEquipamentoPermanently: () => deleteMutation,
}));

describe('TiposEquipamentoAdminPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista os tipos cadastrados', () => {
    render(<TiposEquipamentoAdminPage />);
    expect(screen.getByText('Notebook')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('cria um novo tipo exigindo termo por padrão', async () => {
    render(<TiposEquipamentoAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo tipo' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Headset');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Headset', exigeTermo: true }),
    );
  });

  it('desativa um tipo pelo toggle de status', async () => {
    render(<TiposEquipamentoAdminPage />);
    await userEvent.click(screen.getByLabelText('Desativar tipo'));
    expect(updateMutation.mutate).toHaveBeenCalledWith(
      { id: 't1', input: { ativo: false } },
      expect.anything(),
    );
  });
});
