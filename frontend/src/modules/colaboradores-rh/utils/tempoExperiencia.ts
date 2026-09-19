export interface PeriodoExperiencia {
  dataInicio: string;
  dataFim: string | null;
}

function mesesEntre(inicio: Date, fim: Date): number {
  const meses =
    (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
    (fim.getUTCMonth() - inicio.getUTCMonth()) -
    (fim.getUTCDate() < inicio.getUTCDate() ? 1 : 0);
  return Math.max(0, meses);
}

/** Soma o tenure interno (admissão) com todos os períodos externos, em anos e meses. */
export function calcularTempoExperiencia(interno: PeriodoExperiencia | null, externos: PeriodoExperiencia[]): string {
  const hoje = new Date();
  const totalMeses = [...(interno ? [interno] : []), ...externos].reduce((soma, periodo) => {
    const fim = periodo.dataFim ? new Date(periodo.dataFim) : hoje;
    return soma + mesesEntre(new Date(periodo.dataInicio), fim);
  }, 0);

  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  if (anos === 0 && meses === 0) return 'Menos de 1 mês';
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}
