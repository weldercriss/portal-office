/**
 * Dias restantes até a próxima ocorrência anual (mês/dia) de `dataBase`, a partir de `hoje`.
 * Se a data já passou este ano, calcula para o ano seguinte. 29/02 sem 29/02 no ano seguinte cai em 28/02.
 */
export function diasAteProximaOcorrencia(dataBase: Date, hoje = new Date()): number {
  const hojeUtc = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const mes = dataBase.getUTCMonth();
  const dia = dataBase.getUTCDate();

  let proxima = new Date(Date.UTC(hoje.getUTCFullYear(), mes, dia));
  if (proxima.getUTCDate() !== dia) proxima = new Date(Date.UTC(hoje.getUTCFullYear(), mes + 1, 0));
  if (Date.UTC(proxima.getUTCFullYear(), proxima.getUTCMonth(), proxima.getUTCDate()) < hojeUtc) {
    proxima = new Date(Date.UTC(hoje.getUTCFullYear() + 1, mes, dia));
    if (proxima.getUTCDate() !== dia) proxima = new Date(Date.UTC(hoje.getUTCFullYear() + 1, mes + 1, 0));
  }

  const proximaUtc = Date.UTC(proxima.getUTCFullYear(), proxima.getUTCMonth(), proxima.getUTCDate());
  return Math.round((proximaUtc - hojeUtc) / (1000 * 60 * 60 * 24));
}

export function anosCompletosEm(dataBase: Date, dataAlvo: Date): number {
  let anos = dataAlvo.getUTCFullYear() - dataBase.getUTCFullYear();
  const aindaNaoFezAniversario =
    dataAlvo.getUTCMonth() < dataBase.getUTCMonth() ||
    (dataAlvo.getUTCMonth() === dataBase.getUTCMonth() && dataAlvo.getUTCDate() < dataBase.getUTCDate());
  if (aindaNaoFezAniversario) anos -= 1;
  return anos;
}
