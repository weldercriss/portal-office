import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConviteAgendaDialog } from './ConviteAgendaDialog';
import type { ConviteAgenda } from '../types/convite-agenda.types';

const verificarMutation = { mutateAsync: vi.fn(), isPending: false };
const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

vi.mock('../hooks/useConvitesAgenda', () => ({
  useColaboradoresParaConvite: () => ({
    data: [
      { id: 'u1', nome: 'Ana Lima', email: 'ana@empresa.com', disponivel: true },
      { id: 'u2', nome: 'Bruno Souza', email: 'bruno@empresa.com', disponivel: false },
    ],
    isLoading: false,
  }),
  useVerificarConviteAgenda: () => verificarMutation,
  useCreateConviteAgenda: () => createMutation,
  useUpdateConviteAgenda: () => updateMutation,
}));

const CONVITE: ConviteAgenda = {
  id: 'c1',
  titulo: 'Kickoff Q4',
  descricao: null,
  local: null,
  inicio: '2098-12-31T14:00:00.000Z',
  fim: '2098-12-31T15:00:00.000Z',
  criadoPor: { id: 'admin1', nome: 'Admin' },
  criadoEm: '2026-09-15T00:00:00.000Z',
  destinatarios: [
    { id: 'd1', userId: 'u1', user: { id: 'u1', nome: 'Ana Lima', email: 'ana@empresa.com' }, status: 'CRIADO', erro: null },
    { id: 'd2', userId: 'u3', user: { id: 'u3', nome: 'Carla Reis', email: 'carla@empresa.com' }, status: 'CANCELADO', erro: null },
  ],
};

function abrirNovo() {
  render(<ConviteAgendaDialog open onOpenChange={vi.fn()} />);
}

function abrirEdicao() {
  render(<ConviteAgendaDialog open onOpenChange={vi.fn()} convite={CONVITE} />);
}

async function preencherHorario() {
  await userEvent.type(screen.getByLabelText('Título'), 'Reunião geral');
  await userEvent.type(screen.getByLabelText('Início'), '2098-12-31T14:00');
  await userEvent.type(screen.getByLabelText('Fim'), '2098-12-31T15:00');
}

describe('ConviteAgendaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verificarMutation.mutateAsync.mockResolvedValue([{ userId: 'u1', disponivel: true, conflitos: [] }]);
  });

  describe('criação', () => {
    it('mostra quem não conectou a Agenda Google como indisponível e sem poder ser selecionado', () => {
      abrirNovo();
      const linhaIndisponivel = screen.getByText('Bruno Souza').closest('label')!;
      expect(within(linhaIndisponivel).getByText('Indisponível')).toBeInTheDocument();
      expect(within(linhaIndisponivel).getByRole('checkbox')).toBeDisabled();
    });

    it('não deixa enviar sem antes verificar a disponibilidade', async () => {
      abrirNovo();
      await preencherHorario();
      const linhaAna = screen.getByText('Ana Lima').closest('label')!;
      await userEvent.click(within(linhaAna).getByRole('checkbox'));

      expect(screen.getByRole('button', { name: /Enviar convites/ })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: /Verificar disponibilidade/ }));

      expect(verificarMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ destinatarioIds: ['u1'] }));
      expect(screen.getByRole('button', { name: /Enviar convites/ })).toBeEnabled();
    });
  });

  describe('edição', () => {
    it('pré-preenche os dados do convite e mostra destinatários fixos, sem checkbox', () => {
      abrirEdicao();

      expect(screen.getByLabelText('Título')).toHaveValue('Kickoff Q4');
      expect(screen.getByText('Ana Lima')).toBeInTheDocument();
      expect(screen.getByText('Carla Reis')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Salvar alterações/ })).toBeDisabled();
    });

    it('salva sem exigir destinatarioIds e sem mexer em quem foi cancelado', async () => {
      abrirEdicao();
      verificarMutation.mutateAsync.mockResolvedValue([{ userId: 'u1', disponivel: true, conflitos: [] }]);

      await userEvent.click(screen.getByRole('button', { name: /Verificar disponibilidade/ }));
      expect(verificarMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ destinatarioIds: ['u1'] }));

      await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1', input: expect.objectContaining({ titulo: 'Kickoff Q4' }) }),
      );
      expect(createMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });
});
