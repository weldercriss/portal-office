import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SolicitacoesAdminPage from './SolicitacoesAdminPage';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 's1' }), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 's1' }), isPending: false };
const mutation = { mutate: vi.fn(), isPending: false };
const tipo = { id: 't1', nome: 'Folga', requerAprovacao: false };
const solicitacao = {
  id: 's1', userId: 'u1', user: { id: 'u1', nome: 'Ana' }, tipoId: 't1', tipo,
  responsavelId: 'u2', responsavel: { id: 'u2', nome: 'Bia' },
  dataInicio: '2026-09-10', dataFim: null, descricao: null, anexoNome: null, status: 'APROVADA',
};

vi.mock('../hooks/useSolicitacoes', () => ({
  useSolicitacoes: () => ({ data: [solicitacao], isLoading: false, isError: false }),
  useCreateSolicitacao: () => createMutation,
  useUpdateSolicitacao: () => updateMutation,
  useAprovarSolicitacao: () => mutation,
  useRejeitarSolicitacao: () => mutation,
  useDeleteSolicitacao: () => mutation,
  useAnexarSolicitacao: () => mutation,
}));
vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({ data: [
    { id: 'u1', nome: 'Ana', ativo: true },
    { id: 'u2', nome: 'Bia', ativo: true },
    { id: 'u3', nome: 'Inativo', ativo: false },
  ] }),
}));
vi.mock('../../tipos-solicitacao/hooks/useTiposSolicitacao', () => ({
  useTiposSolicitacao: () => ({ data: [tipo] }),
}));

describe('Responsável da solicitação', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['', 'u2'])('creates a request with an optional responsible person (%s)', async (responsavelId) => {
    render(<SolicitacoesAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Nova solicitação' }));
    const responsavel = screen.getByLabelText('Responsável (opcional)');
    expect(responsavel).not.toBeRequired();
    expect(screen.queryByRole('option', { name: 'Inativo' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Colaborador'), 'u1');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 't1');
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-09-10' } });
    await userEvent.selectOptions(responsavel, responsavelId);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1', responsavelId: responsavelId || null,
    }));
    await userEvent.click(screen.getByRole('button', { name: 'Nova solicitação' }));
    expect(screen.getByLabelText('Responsável (opcional)')).toHaveValue('');
  });

  it('shows the saved person and allows clearing the assignment', async () => {
    render(<SolicitacoesAdminPage />);
    expect(screen.getByRole('cell', { name: 'Bia' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar solicitação de Ana' }));
    expect(screen.getByLabelText('Responsável (opcional)')).toHaveValue('u2');
    await userEvent.selectOptions(screen.getByLabelText('Responsável (opcional)'), '');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 's1', input: expect.objectContaining({ responsavelId: null }),
    });
  });
});
