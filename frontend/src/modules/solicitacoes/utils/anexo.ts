import { baixarAnexoCampoFormulario, baixarAnexoSolicitacao } from '../api/solicitacoes.api';

export async function visualizarAnexoSolicitacao(id: string, campoId?: string) {
  const novaAba = window.open('', '_blank', 'noopener,noreferrer');
  try {
    const blob = campoId ? await baixarAnexoCampoFormulario(id, campoId) : await baixarAnexoSolicitacao(id);
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
