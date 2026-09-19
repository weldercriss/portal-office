import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PesquisaDialog } from './PesquisaDialog';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

vi.mock('../hooks/usePesquisas', () => ({
  useCreatePesquisa: () => createMutation,
}));

vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({
    data: [
      { id: 'u1', nome: 'Ana Lima', email: 'ana@empresa.com', ativo: true, statusColaborador: 'ATIVO' },
      { id: 'u2', nome: 'Bruno Souza', email: 'bruno@empresa.com', ativo: true, statusColaborador: 'ATIVO' },
      { id: 'u3', nome: 'Pendente', email: 'pendente@empresa.com', ativo: true, statusColaborador: 'PENDENTE' },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../tipos-solicitacao/hooks/useTemplatesFormulario', () => ({
  useTemplatesFormulario: () => ({ data: [] }),
  useCreateTemplateFormulario: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('PesquisaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não lista colaboradores pendentes de autorização', () => {
    render(<PesquisaDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('cria a pesquisa com título, campos e destinatários selecionados', async () => {
    render(<PesquisaDialog open onOpenChange={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Título'), 'NPS Setembro');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campo' }));
    await userEvent.type(screen.getByPlaceholderText('Nome do campo'), 'Nota de 0 a 10');

    const linhaAna = screen.getByText('Ana Lima').closest('label')!;
    await userEvent.click(within(linhaAna).getByRole('checkbox'));

    expect(screen.getByRole('button', { name: 'Criar pesquisa' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Criar pesquisa' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'NPS Setembro',
        tipo: 'NPS',
        destinatarios: { userIds: ['u1'] },
        campos: [expect.objectContaining({ label: 'Nota de 0 a 10', tipo: 'TEXTO' })],
      }),
    );
  });

  it('modo "Equipe de um gestor" exige um gestor selecionado', async () => {
    render(<PesquisaDialog open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Feedback 1:1');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campo' }));
    await userEvent.type(screen.getByPlaceholderText('Nome do campo'), 'Comentário');
    await userEvent.click(screen.getByRole('button', { name: 'Equipe de um gestor' }));

    expect(screen.getByRole('button', { name: 'Criar pesquisa' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Gestor'), 'u2');
    expect(screen.getByRole('button', { name: 'Criar pesquisa' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Criar pesquisa' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ destinatarios: { gestorId: 'u2' } }),
    );
  });

  it('o editor de campos não oferece o tipo Anexo de arquivo', async () => {
    render(<PesquisaDialog open onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campo' }));
    const opcoesTipo = within(screen.getByLabelText('Tipo do campo')).getAllByRole('option');
    expect(opcoesTipo.map((o) => o.textContent)).not.toContain('Anexo de arquivo');
  });
});
