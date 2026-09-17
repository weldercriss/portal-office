import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HorarioDisponivel, Sala } from '../types/agendamento.types';
import { SolicitarReservaDialog } from './SolicitarReservaDialog';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

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

const horarios: HorarioDisponivel[] = [
  { horaInicio: '09:00', horaFim: '10:00', disponivel: true },
  { horaInicio: '10:00', horaFim: '11:00', disponivel: true },
  { horaInicio: '11:00', horaFim: '12:00', disponivel: true },
];

vi.mock('../hooks/useAgendamento', () => ({
  useCreateMinhaReserva: () => createMutation,
  useHorarios: () => ({ data: horarios, isError: false, isLoading: false }),
}));

describe('SolicitarReservaDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia somente os campos permitidos ao colaborador', async () => {
    const onOpenChange = vi.fn();
    render(
      <SolicitarReservaDialog
        open
        onOpenChange={onOpenChange}
        salas={[sala]}
        dataPadrao="2099-01-07"
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Sala'), 'sala1');
    await userEvent.type(screen.getByLabelText('Assunto'), 'Planejamento');
    await userEvent.click(screen.getByRole('button', { name: /^09:00/ }));
    await userEvent.click(screen.getByRole('button', { name: /^10:00/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitação' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      salaId: 'sala1',
      data: '2099-01-07',
      horaInicio: '09:00',
      horaFim: '11:00',
      titulo: 'Planejamento',
      observacoes: '',
      notificarTelegram: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
