import { baixarTermo } from '../api/patrimonio.api';

export async function visualizarTermo(alocacaoId: string) {
  const novaAba = window.open('', '_blank', 'noopener,noreferrer');
  try {
    const blob = await baixarTermo(alocacaoId);
    const url = URL.createObjectURL(blob);
    if (novaAba) {
      novaAba.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    novaAba?.close();
    throw error;
  }
}
