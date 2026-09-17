import { RegraRecorrenciaPlantao } from '@prisma/client';

export const MAX_OCORRENCIAS_SERIE = 366;

/**
 * Gera as datas (YYYY-MM-DD) de uma recorrência. Usa exclusivamente métodos UTC pra ficar
 * consistente com o `.slice(0,10)` do frontend — misturar métodos locais aqui deslocaria a
 * série em ±1 dia em servidores fora de UTC+0.
 */
export function gerarDatasRecorrencia(
  regra: RegraRecorrenciaPlantao,
  dataInicioStr: string,
  dataFimStr: string | undefined,
  diasSemana: number[] | undefined,
): string[] {
  if (regra === RegraRecorrenciaPlantao.UNICO) return [dataInicioStr];

  const inicio = new Date(dataInicioStr);
  const fim = new Date(dataFimStr as string);
  const datas: string[] = [];

  if (regra === RegraRecorrenciaPlantao.SEMANAL) {
    const dias = new Set(diasSemana ?? []);
    const cursor = new Date(inicio);
    while (cursor.getTime() <= fim.getTime() && datas.length <= MAX_OCORRENCIAS_SERIE) {
      if (dias.has(cursor.getUTCDay())) datas.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else if (regra === RegraRecorrenciaPlantao.MENSAL) {
    const diaAlvo = inicio.getUTCDate();
    let ano = inicio.getUTCFullYear();
    let mes = inicio.getUTCMonth();
    while (datas.length <= MAX_OCORRENCIAS_SERIE) {
      const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      const dia = Math.min(diaAlvo, ultimoDiaDoMes);
      const candidato = new Date(Date.UTC(ano, mes, dia));
      if (candidato.getTime() > fim.getTime()) break;
      if (candidato.getTime() >= inicio.getTime()) datas.push(candidato.toISOString().slice(0, 10));
      mes += 1;
      if (mes > 11) {
        mes = 0;
        ano += 1;
      }
    }
  }

  return datas;
}
