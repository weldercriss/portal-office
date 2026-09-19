import { httpClient } from '../../../api/httpClient';
import type {
  CategoriaDocumento,
  CreateCategoriaDocumentoInput,
  UpdateCategoriaDocumentoInput,
} from '../types/categoria-documento.types';

export const getCategoriasDocumento = (all = false) =>
  httpClient<CategoriaDocumento[]>(`/categorias-documento${all ? '?all=true' : ''}`);
export const createCategoriaDocumento = (input: CreateCategoriaDocumentoInput) =>
  httpClient<CategoriaDocumento>('/categorias-documento', { method: 'POST', body: input });
export const updateCategoriaDocumento = (id: string, input: UpdateCategoriaDocumentoInput) =>
  httpClient<CategoriaDocumento>(`/categorias-documento/${id}`, { method: 'PATCH', body: input });
export const deleteCategoriaDocumentoPermanently = (id: string) =>
  httpClient<{ success: boolean }>(`/categorias-documento/${id}/permanent`, { method: 'DELETE' });
