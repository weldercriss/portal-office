import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  duracaoEmMinutos,
  emMinutos,
  formatarDuracao,
  janelaQueComporta,
  janelasDoDia,
  motivoInvalido,
  seSobrepoe,
} from './horarios';
import type { Disponibilidade, HorarioDisponivel } from '../types/agendamento.types';

// 2026-09-09 é uma quarta-feira (3); 2026-09-10, uma quinta (4).
const QUARTA = '2026-09-09';
const QUINTA = '2026-09-10';

const comercial: Disponibilidade[] = [
  { diaSemana: 3, horaInicio: '09:00', horaFim: '18:00', duracaoMinutos: 60 },
];

const horarios: HorarioDisponivel[] = [
  { horaInicio: '09:00', horaFim: '10:00', disponivel: true },
  { horaInicio: '10:00', horaFim: '11:00', disponivel: true },
  { horaInicio: '11:00', horaFim: '12:00', disponivel: false },
];

describe('horarios (regras da tela)', () => {
  it('converte hora em minutos e recusa o que não é hora', () => {
    expect(emMinutos('09:30')).toBe(570);
    expect(emMinutos('')).toBeNull();
    expect(emMinutos('25:00')).toBeNull();
  });

  it('só calcula a duração quando o intervalo está completo', () => {
    expect(duracaoEmMinutos({ horaInicio: '09:00', horaFim: '14:30' })).toBe(330);
    expect(duracaoEmMinutos({ horaInicio: '09:00', horaFim: '' })).toBeNull();
  });

  it('escreve a duração do jeito que se lê', () => {
    expect(formatarDuracao(45)).toBe('45min');
    expect(formatarDuracao(120)).toBe('2h');
    expect(formatarDuracao(150)).toBe('2h30');
  });

  it('não trata encostar como sobreposição', () => {
    expect(seSobrepoe({ horaInicio: '09:00', horaFim: '10:00' }, { horaInicio: '10:00', horaFim: '11:00' })).toBe(false);
    expect(seSobrepoe({ horaInicio: '09:00', horaFim: '10:00' }, { horaInicio: '09:30', horaFim: '11:00' })).toBe(true);
  });

  it('lista as janelas do dia da semana pedido', () => {
    expect(janelasDoDia(comercial, QUARTA)).toHaveLength(1);
    expect(janelasDoDia(comercial, QUINTA)).toHaveLength(0);
  });

  describe('janelaQueComporta', () => {
    it('aceita qualquer duração que caiba na janela comercial', () => {
      expect(janelaQueComporta(comercial, QUARTA, { horaInicio: '09:00', horaFim: '18:00' })).toBeDefined();
      expect(janelaQueComporta(comercial, QUARTA, { horaInicio: '10:00', horaFim: '16:00' })).toBeDefined();
      expect(janelaQueComporta(comercial, QUARTA, { horaInicio: '09:15', horaFim: '09:45' })).toBeDefined();
    });

    it('recusa o que vaza da janela', () => {
      expect(janelaQueComporta(comercial, QUARTA, { horaInicio: '17:00', horaFim: '19:00' })).toBeUndefined();
    });
  });

  describe('motivoInvalido', () => {
    beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-09-08T12:00:00Z')));
    afterEach(() => vi.useRealTimers());

    it('libera uma reserva longa dentro do horário comercial', () => {
      expect(motivoInvalido({ horaInicio: '13:00', horaFim: '18:00' }, QUARTA, comercial, horarios)).toBeNull();
    });

    it('libera horário quebrado, fora dos blocos da grade', () => {
      expect(motivoInvalido({ horaInicio: '09:20', horaFim: '10:50' }, QUARTA, comercial, horarios)).toBeNull();
    });

    it('cobra o intervalo completo', () => {
      expect(motivoInvalido({ horaInicio: '09:00', horaFim: '' }, QUARTA, comercial, horarios)).toMatch(/inicial/);
    });

    it('recusa fim antes do início', () => {
      expect(motivoInvalido({ horaInicio: '11:00', horaFim: '10:00' }, QUARTA, comercial, horarios)).toMatch(/depois/);
    });

    it('avisa quando a sala não abre no dia', () => {
      expect(motivoInvalido({ horaInicio: '10:00', horaFim: '11:00' }, QUINTA, comercial, horarios)).toMatch(
        /não abre/,
      );
    });

    it('mostra a faixa comercial quando o horário vaza dela', () => {
      expect(motivoInvalido({ horaInicio: '08:00', horaFim: '10:00' }, QUARTA, comercial, horarios)).toBe(
        'Nesse dia a sala abre das 09:00 às 18:00.',
      );
    });

    it('recusa o horário que encosta numa reserva já feita', () => {
      expect(motivoInvalido({ horaInicio: '10:30', horaFim: '13:00' }, QUARTA, comercial, horarios)).toBe(
        'Já existe reserva entre 11:00 e 12:00.',
      );
    });
  });
});
