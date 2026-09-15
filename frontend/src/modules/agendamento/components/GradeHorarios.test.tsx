import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GradeHorarios } from './GradeHorarios';
import type { HorarioDisponivel } from '../types/agendamento.types';

const horarios: HorarioDisponivel[] = [
  { horaInicio: '09:00', horaFim: '10:00', disponivel: true },
  { horaInicio: '10:00', horaFim: '11:00', disponivel: true },
  { horaInicio: '11:00', horaFim: '12:00', disponivel: false },
  { horaInicio: '12:00', horaFim: '13:00', disponivel: true },
];

// Bem no futuro: os testes de seleção normal não precisam mexer no relógio do sistema.
const DATA = '2099-01-01';

const botao = (horaInicio: string) => screen.getByRole('button', { name: new RegExp(`^${horaInicio}`) });

describe('GradeHorarios', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('desabilita o horário já reservado', () => {
    render(<GradeHorarios data={DATA} horarios={horarios} onSelecionar={vi.fn()} />);
    expect(botao('11:00')).toBeDisabled();
    expect(botao('09:00')).toBeEnabled();
  });

  it('não deixa selecionar quando é só panorama do dia', () => {
    render(<GradeHorarios data={DATA} horarios={horarios} />);
    expect(botao('09:00')).toBeDisabled();
  });

  it('seleciona um horário livre', async () => {
    const onSelecionar = vi.fn();
    render(<GradeHorarios data={DATA} horarios={horarios} onSelecionar={onSelecionar} />);

    await userEvent.click(botao('09:00'));
    expect(onSelecionar).toHaveBeenCalledWith({ horaInicio: '09:00', horaFim: '10:00' });
  });

  it('estende a seleção até um horário posterior livre', async () => {
    const onSelecionar = vi.fn();
    render(
      <GradeHorarios
        data={DATA}
        horarios={horarios}
        selecionado={{ horaInicio: '09:00', horaFim: '10:00' }}
        onSelecionar={onSelecionar}
      />,
    );

    await userEvent.click(botao('10:00'));
    expect(onSelecionar).toHaveBeenCalledWith({ horaInicio: '09:00', horaFim: '11:00' });
  });

  it('não estende por cima de um horário reservado: recomeça no horário clicado', async () => {
    const onSelecionar = vi.fn();
    render(
      <GradeHorarios
        data={DATA}
        horarios={horarios}
        selecionado={{ horaInicio: '09:00', horaFim: '10:00' }}
        onSelecionar={onSelecionar}
      />,
    );

    await userEvent.click(botao('12:00'));
    expect(onSelecionar).toHaveBeenCalledWith({ horaInicio: '12:00', horaFim: '13:00' });
  });

  it('clicar num horário anterior recomeça a seleção ali', async () => {
    const onSelecionar = vi.fn();
    render(
      <GradeHorarios
        data={DATA}
        horarios={horarios}
        selecionado={{ horaInicio: '10:00', horaFim: '11:00' }}
        onSelecionar={onSelecionar}
      />,
    );

    await userEvent.click(botao('09:00'));
    expect(onSelecionar).toHaveBeenCalledWith({ horaInicio: '09:00', horaFim: '10:00' });
  });

  it('marca como pressionado todo horário dentro da seleção', () => {
    render(
      <GradeHorarios
        data={DATA}
        horarios={horarios}
        selecionado={{ horaInicio: '09:00', horaFim: '11:00' }}
        onSelecionar={vi.fn()}
      />,
    );

    expect(botao('09:00')).toHaveAttribute('aria-pressed', 'true');
    expect(botao('10:00')).toHaveAttribute('aria-pressed', 'true');
    expect(botao('12:00')).toHaveAttribute('aria-pressed', 'false');
  });

  it('desabilita um horário de hoje cujo início já passou', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T13:30:00.000Z')); // 10:30 em America/Sao_Paulo

    render(<GradeHorarios data="2026-09-09" horarios={horarios} onSelecionar={vi.fn()} />);

    expect(botao('09:00')).toBeDisabled();
    expect(botao('10:00')).toBeDisabled();
    expect(botao('12:00')).toBeEnabled();
  });
});
