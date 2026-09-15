import { baixarDocumento } from '../api/colaborador-rh.api';

export async function visualizarDocumento(userId: string, id: string) {
  const novaAba = window.open('', '_blank', 'noopener,noreferrer');
  try {
    const blob = await baixarDocumento(userId, id);
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
