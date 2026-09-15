import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DepartamentosAdminPage from './DepartamentosAdminPage';
import type { Departamento } from '../types/departamento.types';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const deactivateMutation = { mutate: vi.fn() };
const deleteMutation = { mutate: vi.fn(), isPending: false };

const departamento: Departamento = {
  id: 'g1',
  nome: 'Suporte N1',
  ativo: true,
  fazPlantao: false,
  responsavelId: null,
  responsavel: null,
};

vi.mock('../hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ data: [departamento], isError: false, isLoading: false, refetch: vi.fn() }),
  useCreateDepartamento: () => createMutation,
  useUpdateDepartamento: () => updateMutation,
  useDeactivateDepartamento: () => deactivateMutation,
  useDeleteDepartamentoPermanently: () => deleteMutation,
}));

vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({ data: [], isError: false, isLoading: false, refetch: vi.fn() }),
}));

vi.mock('../../subareas/hooks/useSubAreas', () => ({
  useSubAreas: () => ({ data: [] }),
}));

const ROTULO_PLANTAO = 'Este departamento faz plantão';

describe('DepartamentosAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the departments list', () => {
    render(<DepartamentosAdminPage />);
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();
  });

  it('opens the create dialog', async () => {
    render(<DepartamentosAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo departamento' }));
    expect(screen.getByRole('dialog', { name: 'Novo departamento' })).toBeInTheDocument();
  });

  it('creates a department on submit', async () => {
    render(<DepartamentosAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo departamento' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Financeiro');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      nome: 'Financeiro',
      responsavelId: null,
      fazPlantao: false,
    });
  });

  it('marks the department as doing on-call duty', async () => {
    render(<DepartamentosAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo departamento' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Suporte');
    await userEvent.click(screen.getByLabelText(ROTULO_PLANTAO));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Suporte', fazPlantao: true }),
    );
  });
});
