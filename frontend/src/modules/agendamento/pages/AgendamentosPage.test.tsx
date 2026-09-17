import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgendamentosPage from './AgendamentosPage';
import type { HorarioDisponivel, Reserva, Sala } from '../types/agendamento.types';

const cancelarMutation = { mutate: vi.fn(), isPending: false };
const cancelarMinhaMutation = { mutate: vi.fn(), isPending: false };
const confirmarMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
const createMinhaMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

const sala: Sala = {
  id: 'sala1',
  nome: 'Sala Azul',
  localizacao: '2º andar',
  capacidade: 8,
  observacoes: null,
  ativo: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
  disponibilidades: [{ id: 'd1', diaSemana: 3, horaInicio: '09:00', horaFim: '12:00', duracaoMinutos: 60 }],
};

const reserva: Reserva = {
  id: 'r1',
  salaId: 'sala1',
  sala: { id: 'sala1', nome: 'Sala Azul', localizacao: '2º andar' },
  solicitanteId: 'u1',
  responsavelId: null,
  responsavel: null,
  destinatariosNotificacao: 'SOLICITANTE',
  solicitante: { id: 'u1', nome: 'Ana Lima', email: 'ana@suri.com' },
  registradoPor: { id: 'admin1', nome: 'Administrador' },
  // Bem no futuro: os testes de ação normal não precisam mexer no relógio do sistema.
  data: '2099-01-01T00:00:00.000Z',
  horaInicio: '10:00',
  horaFim: '11:00',
  titulo: 'Reunião de squad',
  observacoes: null,
  status: 'CONFIRMADA',
  motivoCancelamento: null,
  canceladoEm: null,
  notificarTelegram: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
};

const horarios: HorarioDisponivel[] = [
  { horaInicio: '09:00', horaFim: '10:00', disponivel: true },
  { horaInicio: '10:00', horaFim: '11:00', disponivel: false },
  { horaInicio: '11:00', horaFim: '12:00', disponivel: true },
];

let salas: Sala[] = [sala];
let papel: 'ADMIN' | 'USER' = 'ADMIN';
let reservas: Reserva[] = [reserva];
let permiteSolicitacaoColaborador = false;

vi.mock('../hooks/useAgendamento', () => ({
  useSalas: () => ({ data: salas, isError: false, isLoading: false, refetch: vi.fn() }),
  useAgendamentoConfig: () => ({
    data: { permiteSolicitacaoColaborador },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useReservas: () => ({ data: reservas, isError: false, isLoading: false, refetch: vi.fn() }),
  useHorarios: () => ({ data: horarios, isError: false, isLoading: false }),
  useCancelarReserva: () => cancelarMutation,
  useCancelarMinhaReserva: () => cancelarMinhaMutation,
  useCreateMinhaReserva: () => createMinhaMutation,
  useCreateReserva: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateReserva: () => confirmarMutation,
  useCreateSala: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateSala: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

vi.mock('../hooks/useAgendamentoSocket', () => ({
  useAgendamentoSocket: vi.fn(),
}));

vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({ data: [{ id: 'u1', nome: 'Ana Lima', ativo: true }], isError: false, isLoading: false }),
  useUpdateUsuario: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

vi.mock('../../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin1', nome: 'Admin', email: 'admin@suri.com', role: papel, rotinas: [] } }),
}));

describe('AgendamentosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    salas = [sala];
    papel = 'ADMIN';
    reservas = [reserva];
    permiteSolicitacaoColaborador = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista a reserva do dia com solicitante, sala, horário e status', () => {
    render(<AgendamentosPage />);

    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Reunião de squad')).toBeInTheDocument();
    expect(screen.getByText('10:00 às 11:00')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Confirmada')).toBeInTheDocument();
  });

  it('mostra a grade da sala com o horário já tomado bloqueado', async () => {
    render(<AgendamentosPage />);
    await userEvent.selectOptions(screen.getByLabelText('Sala'), 'sala1');

    expect(screen.getByRole('button', { name: /^10:00/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^09:00/ })).toBeDisabled();
  });

  it('pede o motivo antes de cancelar e libera o horário', async () => {
    render(<AgendamentosPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar reserva de Ana Lima' }));

    const dialogo = screen.getByRole('dialog', { name: 'Cancelar reserva' });
    expect(dialogo).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Motivo (opcional)'), 'Sala em manutenção');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));

    expect(cancelarMutation.mutate).toHaveBeenCalledWith(
      { id: 'r1', motivo: 'Sala em manutenção' },
      expect.anything(),
    );
  });

  it('confirma uma reserva solicitada com um clique, sem abrir diálogo', async () => {
    reservas = [{ ...reserva, id: 'r2', status: 'SOLICITADA' }];

    render(<AgendamentosPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar reserva de Ana Lima' }));

    expect(confirmarMutation.mutate).toHaveBeenCalledWith(
      { id: 'r2', input: { status: 'CONFIRMADA' } },
      expect.anything(),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('numa reserva confirmada em andamento, só mostra cancelar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T13:30:00.000Z')); // 10:30 em America/Sao_Paulo, entre 10:00 e 11:00
    reservas = [{ ...reserva, data: '2026-09-09T00:00:00.000Z', status: 'CONFIRMADA' }];

    render(<AgendamentosPage />);

    expect(screen.queryByRole('button', { name: 'Confirmar reserva de Ana Lima' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar reserva de Ana Lima' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar reserva de Ana Lima' })).toBeInTheDocument();
  });

  it('numa reserva confirmada já encerrada, não mostra nenhuma ação', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T14:30:00.000Z')); // 11:30 em America/Sao_Paulo, depois do horaFim (11:00)
    reservas = [{ ...reserva, data: '2026-09-09T00:00:00.000Z' }];

    render(<AgendamentosPage />);

    expect(screen.getByText('Encerrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar reserva de Ana Lima' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar reserva de Ana Lima' })).not.toBeInTheDocument();
  });

  it('numa reserva solicitada, confirmar/editar continuam mesmo com o horário já passado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T14:30:00.000Z')); // bem depois do horaFim (11:00)
    reservas = [{ ...reserva, data: '2026-09-09T00:00:00.000Z', status: 'SOLICITADA' }];

    render(<AgendamentosPage />);

    expect(screen.getByRole('button', { name: 'Confirmar reserva de Ana Lima' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar reserva de Ana Lima' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar reserva de Ana Lima' })).toBeInTheDocument();
  });

  it('esconde as ações de quem não é admin', () => {
    papel = 'USER';
    render(<AgendamentosPage />);

    expect(screen.queryByRole('button', { name: 'Nova reserva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar sala' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar reserva de Ana Lima' })).not.toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('oferece solicitação ao colaborador somente quando a configuração está ligada', async () => {
    papel = 'USER';
    permiteSolicitacaoColaborador = true;
    render(<AgendamentosPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar sala' }));
    expect(screen.getByRole('dialog', { name: 'Solicitar reserva de sala' })).toBeInTheDocument();
  });

  it('permite ao colaborador cancelar somente a própria solicitação pendente', async () => {
    papel = 'USER';
    reservas = [{ ...reserva, solicitanteId: 'admin1', status: 'SOLICITADA' }];
    render(<AgendamentosPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação de Sala Azul' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitação' }));

    expect(cancelarMinhaMutation.mutate).toHaveBeenCalledWith('r1', expect.anything());
  });

  it('oferece cadastrar a primeira sala direto na tela, sem sair para Configurações', async () => {
    salas = [];
    render(<AgendamentosPage />);

    expect(screen.getByText('Nenhuma sala cadastrada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar sala' }));
    expect(screen.getByRole('dialog', { name: 'Nova sala' })).toBeInTheDocument();
  });

  it('abre o diálogo de edição da sala selecionada no filtro', async () => {
    render(<AgendamentosPage />);
    await userEvent.selectOptions(screen.getByLabelText('Sala'), 'sala1');
    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Azul' }));

    const dialogo = screen.getByRole('dialog', { name: 'Editar sala' });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Sala Azul');
  });

  it('abre o diálogo de nova reserva', async () => {
    render(<AgendamentosPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Nova reserva' }));

    expect(screen.getByRole('dialog', { name: 'Nova reserva' })).toBeInTheDocument();
  });
});
