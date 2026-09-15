import { httpClient } from '../../../api/httpClient';
import type { CampoFormulario } from '../../tipos-solicitacao/types/tipo-solicitacao.types';

export interface FormularioPublico {
  tipoNome: string;
  camposFormulario: CampoFormulario[];
}

export function getFormularioPublico(tipoToken: string) {
  return httpClient<FormularioPublico>(`/formulario-publico/${tipoToken}`);
}

export function criarSolicitacaoPublica(tipoToken: string, respostasFormulario: Record<string, string>) {
  return httpClient<{ id: string }>(`/formulario-publico/${tipoToken}`, {
    method: 'POST',
    body: { respostasFormulario },
  });
}

export function anexarCampoFormularioPublico(tipoToken: string, solicitacaoId: string, campoId: string, arquivo: File) {
  const formData = new FormData();
  formData.set('anexo', arquivo);
  return httpClient<{ ok: boolean }>(`/formulario-publico/${tipoToken}/${solicitacaoId}/anexo/${campoId}`, {
    method: 'POST',
    body: formData,
  });
}
