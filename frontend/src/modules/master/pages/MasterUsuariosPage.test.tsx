import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MasterUsuariosPage from './MasterUsuariosPage';
import type { MasterUsuario } from '../types/master.types';

const MASTER: MasterUsuario = { id: 'm1', nome: 'Master Original', email: 'admin@suri.ai', ativo: true, criadoEm: '2026-09-17T00:00:00.000Z' };

let usuarios: MasterUsuario[] = [MASTER];
const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

vi.mock('../hooks/useMasterUsuarios', () => ({
  useMasterUsuarios: () => ({ data: usuarios, isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateMasterUsuario: () => createMutation,
}));

describe('MasterUsuariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usuarios = [MASTER];
  });

  it('lista os usuários master existentes', () => {
    render(<MasterUsuariosPage />);
    expect(screen.getByText('Master Original')).toBeInTheDocument();
    expect(screen.getByText('admin@suri.ai')).toBeInTheDocument();
  });

  it('cria um novo usuário master', async () => {
    render(<MasterUsuariosPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo master' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Segundo Master');
    await userEvent.type(screen.getByLabelText('E-mail'), 'segundo@suri.ai');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha123456');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      nome: 'Segundo Master',
      email: 'segundo@suri.ai',
      senha: 'senha123456',
    });
  });
});
