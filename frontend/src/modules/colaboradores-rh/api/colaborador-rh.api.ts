import { httpClient, httpClientBlob } from '../../../api/httpClient';
import type {
  ChecklistItem,
  CreateDependenteInput,
  CreateHistoricoInput,
  DadosSensiveis,
  Dependente,
  DocumentoColaborador,
  HistoricoProfissional,
  TipoChecklist,
  UpdateDadosSensiveisInput,
  UpdateHistoricoInput,
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
export const updateHistorico = (userId: string, id: string, input: UpdateHistoricoInput) =>
  httpClient<HistoricoProfissional>(`/colaboradores/${userId}/historico/${id}`, { method: 'PATCH', body: input });
export const deleteHistorico = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/historico/${id}`, { method: 'DELETE' });

// Checklist (admissão/desligamento)
export const getChecklist = (userId: string, tipo: TipoChecklist) =>
  httpClient<ChecklistItem[]>(`/colaboradores/${userId}/checklist?tipo=${tipo}`);
export const gerarChecklistPadrao = (userId: string, tipo: TipoChecklist) =>
  httpClient<{ count: number }>(`/colaboradores/${userId}/checklist/padrao`, { method: 'POST', body: { tipo } });
export const createChecklistItem = (userId: string, input: { titulo: string; tipo: TipoChecklist; categoria?: string }) =>
  httpClient<ChecklistItem>(`/colaboradores/${userId}/checklist`, { method: 'POST', body: input });
export const updateChecklistItem = (
  userId: string,
  id: string,
  input: { status?: 'PENDENTE' | 'CONCLUIDO'; observacaoInterna?: string },
) => httpClient<ChecklistItem>(`/colaboradores/${userId}/checklist/${id}`, { method: 'PATCH', body: input });
export const deleteChecklistItem = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/checklist/${id}`, { method: 'DELETE' });

// Documentos
export const getDocumentos = (userId: string) =>
  httpClient<DocumentoColaborador[]>(`/colaboradores/${userId}/documentos`);
export const uploadDocumento = (
  userId: string,
  input: { nome: string; categoriaId: string; validade?: string; competencia?: string; arquivo: File },
) => {
  const formData = new FormData();
  formData.set('nome', input.nome);
  formData.set('categoriaId', input.categoriaId);
  if (input.validade) formData.set('validade', input.validade);
  if (input.competencia) formData.set('competencia', input.competencia);
  formData.set('arquivo', input.arquivo);
  return httpClient<DocumentoColaborador>(`/colaboradores/${userId}/documentos`, { method: 'POST', body: formData });
};
export const deleteDocumento = (userId: string, id: string) =>
  httpClient<{ success: boolean }>(`/colaboradores/${userId}/documentos/${id}`, { method: 'DELETE' });
export const baixarDocumento = (userId: string, id: string) =>
  httpClientBlob(`/colaboradores/${userId}/documentos/${id}/arquivo`);

// Dados sensíveis (saúde e cultural)
export const getDadosSensiveis = (userId: string) => httpClient<DadosSensiveis>(`/colaboradores/${userId}/dados-sensiveis`);
export const updateDadosSensiveis = (userId: string, input: UpdateDadosSensiveisInput) =>
  httpClient<DadosSensiveis>(`/colaboradores/${userId}/dados-sensiveis`, { method: 'PATCH', body: input });

// Foto de perfil
export const uploadAvatar = (userId: string, arquivo: File) => {
  const formData = new FormData();
  formData.set('arquivo', arquivo);
  return httpClient<{ id: string; avatarUrl: string }>(`/colaboradores/${userId}/avatar`, {
    method: 'POST',
    body: formData,
  });
};

