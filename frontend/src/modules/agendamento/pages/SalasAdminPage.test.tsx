import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalasAdminPage from './SalasAdminPage';
import type { Sala } from '../types/agendamento.types';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), mutate: vi.fn(), isPending: false };
const deleteMutation = { mutate: vi.fn(), isPending: false };

const sala: Sala = {
  id: 'sala1',
  nome: 'Sala Azul',
  localizacao: '2º andar',
  capacidade: 8,
  observacoes: null,
  ativo: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
  disponibilidades: [{ id: 'd1', diaSemana: 1, horaInicio: '09:00', horaFim: '18:00', duracaoMinutos: 60 }],
};

vi.mock('../hooks/useAgendamento', () => ({
  useSalas: () => ({ data: [sala], isError: false, isLoading: false, refetch: vi.fn() }),
  useCreateSala: () => createMutation,
  useUpdateSala: () => updateMutation,
  useDeactivateSala: () => ({ mutate: vi.fn() }),
  useDeleteSalaPermanently: () => deleteMutation,
}));

describe('SalasAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista as salas com o resumo da disponibilidade', () => {
    render(<SalasAdminPage />);
    expect(screen.getByText('Sala Azul')).toBeInTheDocument();
    expect(screen.getByText('Seg 09:00–18:00')).toBeInTheDocument();
  });

  it('cadastra uma sala com uma janela de disponibilidade', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Nova sala' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Sala Verde');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar janela' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    // Campo em branco vai como vazio/nulo: é assim que o backend sabe limpá-lo.
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      nome: 'Sala Verde',
      localizacao: '',
      capacidade: null,
      observacoes: '',
      disponibilidades: [{ diaSemana: 1, horaInicio: '09:00', horaFim: '18:00', duracaoMinutos: 60 }],
    });
  });

  it('limpa o local de uma sala ao apagar o campo', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Azul' }));
    await userEvent.clear(screen.getByLabelText('Local'));
    await userEvent.clear(screen.getByLabelText('Capacidade'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'sala1',
      input: expect.objectContaining({ localizacao: '', capacidade: null }),
    });
  });

  it('avisa que a sala sem janela não aceita reservas', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Nova sala' }));
    expect(screen.getByText('Sem janelas cadastradas, a sala não aceita reservas.')).toBeInTheDocument();
  });

  it('abre a edição já com a grade da sala carregada', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Azul' }));

    expect(screen.getByRole('dialog', { name: 'Editar sala' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Sala Azul');
    expect(screen.getByLabelText('Abre em Segunda')).toHaveValue('09:00');
  });

  it('oferece blocos maiores que uma hora para a grade do dia', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Azul' }));

    const blocos = screen.getByLabelText('Blocos de Segunda');
    expect([...blocos.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      '15 min',
      '30 min',
      '1h',
      '2h',
      '3h',
      '4h',
    ]);
  });

  it('remove uma janela da grade', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Azul' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover janela de Segunda' }));

    expect(screen.getByText('Sem janelas cadastradas, a sala não aceita reservas.')).toBeInTheDocument();
  });

  it('mostra o erro do servidor ao salvar', async () => {
    createMutation.mutateAsync.mockRejectedValueOnce(new Error('Já existe uma sala com esse nome'));
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Nova sala' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Sala Azul');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Já existe uma sala com esse nome')).toBeInTheDocument();
  });

  it('confirma antes de excluir permanentemente', async () => {
    render(<SalasAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Sala Azul' }));
    expect(screen.getByRole('dialog', { name: 'Excluir sala' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir permanentemente' }));
    expect(deleteMutation.mutate).toHaveBeenCalledWith('sala1', expect.anything());
  });
});
