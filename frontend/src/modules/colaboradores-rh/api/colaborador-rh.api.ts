import { httpClient, httpClientBlob } from '../../../api/httpClient';
import type {
  ChecklistItem,
  CreateDependenteInput,
  CreateHistoricoInput,
  Dependente,
  DocumentoColaborador,
  HistoricoProfissional,
  TipoDocumentoColaborador,
} from '../types/colaborador-rh.types';

// Dependentes
export const getDependentes = (userId: string) => httpClient<Dependente[]>(`/colaboradores/${userId}/dependentes`);
export const createDependente = (userId: string, input: CreateDependenteInput) =>
  httpClient<Dependente>(`/colaboradores/${userId}/dependentes`, { method: 'POST', body: input });
export const deleteDependente = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/dependentes/${id}`, { method: 'DELETE' });

// Histórico profissional
export const getHistorico = (userId: string) =>
  httpClient<HistoricoProfissional[]>(`/colaboradores/${userId}/historico`);
export const createHistorico = (userId: string, input: CreateHistoricoInput) =>
  httpClient<HistoricoProfissional>(`/colaboradores/${userId}/historico`, { method: 'POST', body: input });
export const deleteHistorico = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/historico/${id}`, { method: 'DELETE' });

// Checklist de admissão
export const getChecklist = (userId: string) => httpClient<ChecklistItem[]>(`/colaboradores/${userId}/checklist`);
export const gerarChecklistPadrao = (userId: string) =>
  httpClient<{ count: number }>(`/colaboradores/${userId}/checklist/padrao`, { method: 'POST' });
export const createChecklistItem = (userId: string, titulo: string) =>
  httpClient<ChecklistItem>(`/colaboradores/${userId}/checklist`, { method: 'POST', body: { titulo } });
export const updateChecklistItem = (userId: string, id: string, status: 'PENDENTE' | 'CONCLUIDO') =>
  httpClient<ChecklistItem>(`/colaboradores/${userId}/checklist/${id}`, { method: 'PATCH', body: { status } });
export const deleteChecklistItem = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/checklist/${id}`, { method: 'DELETE' });

// Documentos
export const getDocumentos = (userId: string) =>
  httpClient<DocumentoColaborador[]>(`/colaboradores/${userId}/documentos`);
export const uploadDocumento = (
  userId: string,
  input: { nome: string; tipo: TipoDocumentoColaborador; validade?: string; arquivo: File },
) => {
  const formData = new FormData();
  formData.set('nome', input.nome);
  formData.set('tipo', input.tipo);
  if (input.validade) formData.set('validade', input.validade);
  formData.set('arquivo', input.arquivo);
  return httpClient<DocumentoColaborador>(`/colaboradores/${userId}/documentos`, { method: 'POST', body: formData });
};
export const deleteDocumento = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/documentos/${id}`, { method: 'DELETE' });
export const baixarDocumento = (userId: string, id: string) =>
  httpClientBlob(`/colaboradores/${userId}/documentos/${id}/arquivo`);

