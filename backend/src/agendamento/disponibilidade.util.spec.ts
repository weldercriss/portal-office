import {
  dentroDaDisponibilidade,
  diaSemanaDe,
  emHora,
  emMinutos,
  horariosDoDia,
  janelasConflitantes,
  seSobrepoe,
} from './disponibilidade.util';

const janela = (diaSemana: number, horaInicio: string, horaFim: string, duracaoMinutos = 60) => ({
  diaSemana,
  horaInicio,
  horaFim,
  duracaoMinutos,
});

// 2026-09-09 é uma quarta-feira (3).
const QUARTA = '2026-09-09';
const QUINTA = '2026-09-10';

describe('disponibilidade.util', () => {
  it('converte hora e minutos nos dois sentidos', () => {
    expect(emMinutos('09:30')).toBe(570);
    expect(emHora(570)).toBe('09:30');
    expect(emHora(0)).toBe('00:00');
  });

  it('lê o dia da semana em UTC, sem depender do fuso do servidor', () => {
    expect(diaSemanaDe(QUARTA)).toBe(3);
    expect(diaSemanaDe(QUINTA)).toBe(4);
  });

  describe('seSobrepoe', () => {
    it('não considera conflito quando um intervalo apenas encosta no outro', () => {
      expect(seSobrepoe({ horaInicio: '10:00', horaFim: '11:00' }, { horaInicio: '11:00', horaFim: '12:00' })).toBe(
        false,
      );
    });

    it('detecta sobreposição parcial e contenção', () => {
      expect(seSobrepoe({ horaInicio: '10:00', horaFim: '11:00' }, { horaInicio: '10:30', horaFim: '12:00' })).toBe(
        true,
      );
      expect(seSobrepoe({ horaInicio: '10:00', horaFim: '12:00' }, { horaInicio: '10:30', horaFim: '11:00' })).toBe(
        true,
      );
    });
  });

  describe('janelasConflitantes', () => {
    it('aceita janelas do mesmo dia que não se tocam', () => {
      expect(janelasConflitantes([janela(3, '08:00', '12:00'), janela(3, '13:00', '18:00')])).toBe(false);
    });

    it('aceita o mesmo horário em dias diferentes', () => {
      expect(janelasConflitantes([janela(3, '08:00', '12:00'), janela(4, '08:00', '12:00')])).toBe(false);
    });

    it('recusa janelas sobrepostas no mesmo dia', () => {
      expect(janelasConflitantes([janela(3, '08:00', '12:00'), janela(3, '11:00', '14:00')])).toBe(true);
    });
  });

  describe('horariosDoDia', () => {
    it('fatia a janela do dia na duração configurada', () => {
      const horarios = horariosDoDia([janela(3, '09:00', '12:00')], QUARTA, []);
      expect(horarios.map((h) => `${h.horaInicio}-${h.horaFim}`)).toEqual(['09:00-10:00', '10:00-11:00', '11:00-12:00']);
      expect(horarios.every((h) => h.disponivel)).toBe(true);
    });

    it('descarta a sobra que não comporta um horário inteiro', () => {
      const horarios = horariosDoDia([janela(3, '09:00', '10:30')], QUARTA, []);
      expect(horarios.map((h) => h.horaInicio)).toEqual(['09:00']);
    });

    it('ignora janelas de outro dia da semana', () => {
      expect(horariosDoDia([janela(4, '09:00', '12:00')], QUARTA, [])).toHaveLength(0);
    });

    it('marca como indisponível o horário já tomado e mantém os demais', () => {
      const horarios = horariosDoDia([janela(3, '09:00', '12:00')], QUARTA, [
        { horaInicio: '10:00', horaFim: '11:00' },
      ]);
      expect(horarios.map((h) => h.disponivel)).toEqual([true, false, true]);
    });

    it('derruba todos os horários que a reserva atravessa', () => {
      const horarios = horariosDoDia([janela(3, '09:00', '12:00')], QUARTA, [
        { horaInicio: '09:30', horaFim: '11:30' },
      ]);
      expect(horarios.map((h) => h.disponivel)).toEqual([false, false, false]);
    });

    it('junta janelas do mesmo dia em ordem de horário', () => {
      const horarios = horariosDoDia([janela(3, '14:00', '15:00'), janela(3, '09:00', '10:00')], QUARTA, []);
      expect(horarios.map((h) => h.horaInicio)).toEqual(['09:00', '14:00']);
    });
  });

  describe('dentroDaDisponibilidade', () => {
    const janelas = [janela(3, '09:00', '12:00')];

    it('aceita o horário que cabe inteiro na janela', () => {
      expect(dentroDaDisponibilidade(janelas, QUARTA, { horaInicio: '09:00', horaFim: '12:00' })).toBe(true);
      expect(dentroDaDisponibilidade(janelas, QUARTA, { horaInicio: '10:00', horaFim: '11:00' })).toBe(true);
    });

    it('recusa horário que vaza da janela', () => {
      expect(dentroDaDisponibilidade(janelas, QUARTA, { horaInicio: '11:00', horaFim: '13:00' })).toBe(false);
    });

    it('recusa dia da semana sem janela cadastrada', () => {
      expect(dentroDaDisponibilidade(janelas, QUINTA, { horaInicio: '10:00', horaFim: '11:00' })).toBe(false);
    });

    it('recusa horário que atravessa duas janelas separadas', () => {
      const duas = [janela(3, '09:00', '12:00'), janela(3, '13:00', '18:00')];
      expect(dentroDaDisponibilidade(duas, QUARTA, { horaInicio: '11:00', horaFim: '14:00' })).toBe(false);
    });
  });
});
