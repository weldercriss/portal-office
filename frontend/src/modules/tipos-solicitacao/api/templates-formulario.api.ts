import { httpClient } from '../../../api/httpClient';
import type { CampoFormulario, TemplateFormulario } from '../types/tipo-solicitacao.types';

export function getTemplatesFormulario() {
  return httpClient<TemplateFormulario[]>('/templates-formulario');
}

export function createTemplateFormulario(input: { nome: string; campos: CampoFormulario[] }) {
  return httpClient<TemplateFormulario>('/templates-formulario', { method: 'POST', body: input });
}

export function deleteTemplateFormulario(id: string) {
  return httpClient<{ success: boolean }>(`/templates-formulario/${id}`, { method: 'DELETE' });
}
