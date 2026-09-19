import { describe, expect, it } from 'vitest';
import { calcularTempoExperiencia } from './tempoExperiencia';

describe('calcularTempoExperiencia', () => {
  it('soma tenure interno com períodos externos encerrados', () => {
    const resultado = calcularTempoExperiencia(
      { dataInicio: '2024-01-15', dataFim: '2025-01-15' },
      [{ dataInicio: '2020-06-01', dataFim: '2021-06-01' }],
    );
    expect(resultado).toBe('2 anos');
  });

  it('usa hoje como fim quando dataFim é null', () => {
    const hoje = new Date();
    const seisMesesAtras = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 6, hoje.getUTCDate()));
    const resultado = calcularTempoExperiencia(
      { dataInicio: seisMesesAtras.toISOString(), dataFim: null },
      [],
    );
    expect(resultado).toBe('6 meses');
  });

  it('retorna mensagem para menos de um mês sem períodos', () => {
    expect(calcularTempoExperiencia(null, [])).toBe('Menos de 1 mês');
  });
});
