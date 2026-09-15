import { httpClient } from '../../../api/httpClient';
import type { CreateSubAreaInput, SubArea, UpdateSubAreaInput } from '../types/subarea.types';

export function getSubAreas(params?: { groupId?: string; all?: boolean }) {
  const search = new URLSearchParams();
  if (params?.groupId) search.set('groupId', params.groupId);
  if (params?.all) search.set('all', 'true');
  const query = search.toString();
  return httpClient<SubArea[]>(`/subareas${query ? `?${query}` : ''}`);
}

export function createSubArea(input: CreateSubAreaInput) {
  return httpClient<SubArea>('/subareas', { method: 'POST', body: input });
}

export function updateSubArea(id: string, input: UpdateSubAreaInput) {
  return httpClient<SubArea>(`/subareas/${id}`, { method: 'PATCH', body: input });
}

export function deactivateSubArea(id: string) {
  return httpClient<SubArea>(`/subareas/${id}`, { method: 'DELETE' });
}

export function deleteSubAreaPermanently(id: string) {
  return httpClient<{ success: boolean }>(`/subareas/${id}/permanent`, { method: 'DELETE' });
}
