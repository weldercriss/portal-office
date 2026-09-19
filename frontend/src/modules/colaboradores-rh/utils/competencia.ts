const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function formatarCompetencia(iso: string): string {
  const data = new Date(iso);
  return `${MESES[data.getUTCMonth()]} de ${data.getUTCFullYear()}`;
}

/** Agrupa documentos em "pastas" de mês/ano — usa a competência quando existe, senão a data de envio. */
export function agruparPorCompetencia<T extends { competencia: string | null; criadoEm: string }>(
  itens: T[],
): { chave: string; label: string; itens: T[] }[] {
  const grupos = new Map<string, { label: string; itens: T[] }>();
  for (const item of itens) {
    const base = item.competencia ?? item.criadoEm;
    const data = new Date(base);
    const chave = `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
    const atual = grupos.get(chave) ?? { label: formatarCompetencia(base), itens: [] };
    atual.itens.push(item);
    grupos.set(chave, atual);
  }
  return Array.from(grupos.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([chave, valor]) => ({ chave, ...valor }));
}
