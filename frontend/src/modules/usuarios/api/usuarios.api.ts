import { httpClient } from '../../../api/httpClient';
import type { CreateUsuarioInput, UpdateUsuarioInput, Usuario, UsuarioCriado } from '../types/usuario.types';

export interface ChangePasswordInput {
  /** Omitida por quem ainda não tem senha, caso das contas criadas pelo Google. */
  senhaAtual?: string;
  novaSenha: string;
}

export function getUsuarios() {
  return httpClient<Usuario[]>('/users');
}

export function getUsuario(id: string) {
  return httpClient<Usuario>(`/users/${id}`);
}

export function getMeuPerfil() {
  return httpClient<Usuario>('/users/me');
}

export function changeMinhaSenha(input: ChangePasswordInput) {
  return httpClient<{ success: boolean }>('/users/me/password', { method: 'PATCH', body: input });
}

export function createUsuario(input: CreateUsuarioInput) {
  return httpClient<UsuarioCriado>('/users', { method: 'POST', body: input });
}

export function updateUsuario(id: string, input: UpdateUsuarioInput) {
  return httpClient<UsuarioCriado>(`/users/${id}`, { method: 'PATCH', body: input });
}

export function deactivateUsuario(id: string) {
  return httpClient<Usuario>(`/users/${id}`, { method: 'DELETE' });
}

export function setStatusUsuario(id: string, ativo: boolean) {
  return httpClient<Usuario>(`/users/${id}`, { method: 'PATCH', body: { ativo } });
}

export function deleteUsuarioPermanently(id: string) {
  return httpClient<{ success: boolean }>(`/users/${id}/permanent`, { method: 'DELETE' });
}
