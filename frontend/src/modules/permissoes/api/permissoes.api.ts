import { httpClient } from '../../../api/httpClient';
import type { Rotina, RotinaResumo, UserRotinaOverride } from '../types/permissao.types';

export function getRotinas() {
  return httpClient<Rotina[]>('/permissoes/rotinas');
}

export function getGroupRotinas(groupId: string) {
  return httpClient<RotinaResumo[]>(`/permissoes/grupos/${groupId}`);
}

export function setGroupRotinas(groupId: string, rotinas: string[]) {
  return httpClient<RotinaResumo[]>(`/permissoes/grupos/${groupId}`, { method: 'PUT', body: { rotinas } });
}

export function getUserOverrides(userId: string) {
  return httpClient<UserRotinaOverride[]>(`/permissoes/usuarios/${userId}`);
}

export function setUserOverride(userId: string, chave: string, concedida: boolean | null) {
  return httpClient(`/permissoes/usuarios/${userId}/${chave}`, { method: 'PUT', body: { concedida } });
}
