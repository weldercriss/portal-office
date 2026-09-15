import { httpClient } from '../../../api/httpClient';
import type { CreateDepartamentoInput, Departamento, UpdateDepartamentoInput } from '../types/departamento.types';

export function getDepartamentos() {
  return httpClient<Departamento[]>('/groups?all=true');
}

export function createDepartamento(input: CreateDepartamentoInput) {
  return httpClient<Departamento>('/groups', { method: 'POST', body: input });
}

export function updateDepartamento(id: string, input: UpdateDepartamentoInput) {
  return httpClient<Departamento>(`/groups/${id}`, { method: 'PATCH', body: input });
}

export function deactivateDepartamento(id: string) {
  return httpClient<Departamento>(`/groups/${id}`, { method: 'DELETE' });
}

export function deleteDepartamentoPermanently(id: string) {
  return httpClient<{ success: boolean }>(`/groups/${id}/permanent`, { method: 'DELETE' });
}
