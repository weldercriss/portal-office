import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReservaDialog } from './ReservaDialog';
import type { HorarioDisponivel, Reserva, Sala } from '../types/agendamento.types';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

// 2098-12-31 é uma quarta-feira (3), bem no futuro — os testes de preenchimento
// normal não precisam mexer no relógio do sistema (ver blocoJaPassou).
const QUARTA = '2098-12-31';

const sala: Sala = {
  id: 'sala1',
  nome: 'Sala Azul',
  localizacao: '2º andar',
  capacidade: 8,
  observacoes: null,
  ativo: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
  disponibilidades: [{ id: 'd1', diaSemana: 3, horaInicio: '09:00', horaFim: '18:00', duracaoMinutos: 60 }],
};

const horarios: HorarioDisponivel[] = [
  { horaInicio: '09:00', horaFim: '10:00', disponivel: true },
  { horaInicio: '10:00', horaFim: '11:00', disponivel: true },
  { horaInicio: '11:00', horaFim: '12:00', disponivel: false },
];

vi.mock('../hooks/useAgendamento', () => ({
  useHorarios: () => ({ data: horarios, isError: false, isLoading: false }),
  useCreateReserva: () => createMutation,
  useUpdateReserva: () => updateMutation,
}));

const updateUsuarioMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({
    data: [
      { id: 'u1', nome: 'Ana Lima', ativo: true, telegramUsername: '@ana_lima' },
      { id: 'u2', nome: 'Bruno Souza', ativo: true, telegramUsername: null },
      { id: 'u3', nome: 'Inativo', ativo: false, telegramUsername: null },
    ],
    isError: false,
    isLoading: false,
  }),
  useUpdateUsuario: () => updateUsuarioMutation,
}));

function abrir() {
  render(
    <ReservaDialog open onOpenChange={vi.fn()} salas={[sala]} dataPadrao={QUARTA} salaPadrao="sala1" />,
  );
}

async function preencherSolicitante() {
  await userEvent.selectOptions(screen.getByLabelText('Solicitante'), 'u1');
}

describe('ReservaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra o horário comercial da sala no dia escolhido', () => {
    abrir();
    expect(screen.getByText(/A sala abre das 09:00 às 18:00/)).toBeInTheDocument();
  });

  it.each(['SOLICITANTE', 'RESPONSAVEL', 'AMBOS'])('salva responsável cadastrado e destinatários %s', async (destinatariosNotificacao) => {
    abrir();
    await preencherSolicitante();
    const responsavel = screen.getByRole('combobox', { name: 'Responsável (opcional)' });
    expect(responsavel).not.toBeRequired();
    expect(screen.queryByRole('option', { name: 'Inativo' })).not.toBeInTheDocument();
    await userEvent.selectOptions(responsavel, 'u2');
    await userEvent.selectOptions(screen.getByLabelText('Enviar notificações para'), destinatariosNotificacao);
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      solicitanteId: 'u1', responsavelId: 'u2', destinatariosNotificacao,
    }));
  });

  it('mantém o cadastro sem responsável e os avisos para o solicitante por padrão', async () => {
    abrir();
    await preencherSolicitante();
    expect(screen.getByRole('option', { name: 'Somente responsável' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Solicitante e responsável' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      responsavelId: null, destinatariosNotificacao: 'SOLICITANTE',
    }));
  });

  it('carrega a seleção salva e permite remover o responsável na edição', async () => {
    const reserva: Reserva = {
      id: 'r1', salaId: 'sala1', sala, solicitanteId: 'u1',
      solicitante: { id: 'u1', nome: 'Ana Lima', email: '' },
      responsavelId: 'u2', responsavel: { id: 'u2', nome: 'Bruno Souza', email: '' },
      destinatariosNotificacao: 'AMBOS', registradoPor: { id: 'admin', nome: 'Admin' },
      data: QUARTA, horaInicio: '13:00', horaFim: '14:00', titulo: null, observacoes: null,
      status: 'CONFIRMADA', motivoCancelamento: null, canceladoEm: null, notificarTelegram: true, criadoEm: QUARTA,
    };
    render(<ReservaDialog open onOpenChange={vi.fn()} salas={[sala]} dataPadrao={QUARTA} reserva={reserva} />);
    expect(screen.getByLabelText('Responsável (opcional)')).toHaveValue('u2');
    expect(screen.getByLabelText('Enviar notificações para')).toHaveValue('AMBOS');
    await userEvent.selectOptions(screen.getByLabelText('Responsável (opcional)'), '');
    expect(screen.getByLabelText('Enviar notificações para')).toHaveValue('SOLICITANTE');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'r1', input: expect.objectContaining({ responsavelId: null, destinatariosNotificacao: 'SOLICITANTE' }),
    });
  });

  it('atualiza o Telegram apenas do destinatário selecionado', async () => {
    abrir();
    await preencherSolicitante();
    await userEvent.selectOptions(screen.getByLabelText('Responsável (opcional)'), 'u2');
    await userEvent.selectOptions(screen.getByLabelText('Enviar notificações para'), 'RESPONSAVEL');
    expect(screen.queryByLabelText('@usuário do Telegram do solicitante')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('@usuário do Telegram do responsável'), '@bruno');
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));
    expect(updateUsuarioMutation.mutateAsync).toHaveBeenCalledTimes(1);
    expect(updateUsuarioMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'u2', input: { telegramUsername: '@bruno' },
    });
  });

  it('não salva o Telegram digitado se a pessoa deixar de ser destinatária', async () => {
    abrir();
    await preencherSolicitante();
    await userEvent.selectOptions(screen.getByLabelText('Responsável (opcional)'), 'u2');
    await userEvent.selectOptions(screen.getByLabelText('Enviar notificações para'), 'AMBOS');
    await userEvent.type(screen.getByLabelText('@usuário do Telegram do responsável'), '@bruno');
    await userEvent.selectOptions(screen.getByLabelText('Enviar notificações para'), 'SOLICITANTE');
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));
    expect(updateUsuarioMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('reserva quantas horas couberem no horário comercial', async () => {
    abrir();
    await preencherSolicitante();
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '18:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ horaInicio: '13:00', horaFim: '18:00' }),
    );
  });

  it('aceita horário quebrado, fora dos blocos da grade', async () => {
    abrir();
    await preencherSolicitante();
    await userEvent.type(screen.getByLabelText('Início'), '09:20');
    await userEvent.type(screen.getByLabelText('Fim'), '10:50');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ horaInicio: '09:20', horaFim: '10:50' }),
    );
  });

  it('mostra a duração escolhida', async () => {
    abrir();
    await userEvent.type(screen.getByLabelText('Início'), '09:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:30');

    expect(screen.getByText(/Duração: 5h30/)).toBeInTheDocument();
  });

  it('barra o horário que vaza do horário comercial, sem ir ao servidor', async () => {
    abrir();
    await preencherSolicitante();
    await userEvent.type(screen.getByLabelText('Início'), '17:00');
    await userEvent.type(screen.getByLabelText('Fim'), '19:00');

    expect(screen.getByText('Nesse dia a sala abre das 09:00 às 18:00.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar reserva' })).toBeDisabled();
    expect(createMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('barra o horário que atravessa uma reserva já feita', async () => {
    abrir();
    await userEvent.type(screen.getByLabelText('Início'), '10:30');
    await userEvent.type(screen.getByLabelText('Fim'), '13:00');

    expect(screen.getByText('Já existe reserva entre 11:00 e 12:00.')).toBeInTheDocument();
  });

  it('usa o bloco clicado como atalho para preencher o horário', async () => {
    abrir();
    await userEvent.click(screen.getByRole('button', { name: /^09:00/ }));

    expect(screen.getByLabelText('Início')).toHaveValue('09:00');
    expect(screen.getByLabelText('Fim')).toHaveValue('10:00');
  });

  it('emenda blocos seguidos ao clicar num posterior', async () => {
    abrir();
    await userEvent.click(screen.getByRole('button', { name: /^09:00/ }));
    await userEvent.click(screen.getByRole('button', { name: /^10:00/ }));

    expect(screen.getByLabelText('Início')).toHaveValue('09:00');
    expect(screen.getByLabelText('Fim')).toHaveValue('11:00');
  });

  it('manda notificarTelegram ligado por padrão', async () => {
    abrir();
    await preencherSolicitante();
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ notificarTelegram: true }));
    expect(updateUsuarioMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('pede o @usuário do Telegram quando o solicitante ainda não tem um cadastrado', async () => {
    abrir();
    await userEvent.selectOptions(screen.getByLabelText('Solicitante'), 'u2');

    expect(screen.getByLabelText('@usuário do Telegram do solicitante')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('@usuário do Telegram do solicitante'), '@bruno_novo');
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));

    expect(updateUsuarioMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'u2',
      input: { telegramUsername: '@bruno_novo' },
    });
  });

  it('desligar o aviso esconde o campo de usuário e não notifica', async () => {
    abrir();
    await userEvent.selectOptions(screen.getByLabelText('Solicitante'), 'u2');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Notificar por Telegram' }));

    expect(screen.queryByLabelText('@usuário do Telegram do solicitante')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.type(screen.getByLabelText('Fim'), '14:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar reserva' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ notificarTelegram: false }));
  });

  it('acende os blocos que o horário digitado atravessa', async () => {
    abrir();
    await userEvent.type(screen.getByLabelText('Início'), '09:30');
    await userEvent.type(screen.getByLabelText('Fim'), '10:30');

    expect(screen.getByRole('button', { name: /^09:00/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^10:00/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
