import { httpClient } from '../../../api/httpClient';
import type { CreateTurnoInput, Turno, UpdateTurnoInput } from '../types/turno.types';

export function getTurnos(all = false) {
  return httpClient<Turno[]>(`/turnos${all ? '?all=true' : ''}`);
}

export function createTurno(input: CreateTurnoInput) {
  return httpClient<Turno>('/turnos', { method: 'POST', body: input });
}

export function updateTurno(id: string, input: UpdateTurnoInput) {
  return httpClient<Turno>(`/turnos/${id}`, { method: 'PATCH', body: input });
}

export function deactivateTurno(id: string) {
  return httpClient<Turno>(`/turnos/${id}`, { method: 'DELETE' });
}

export function deleteTurnoPermanently(id: string) {
  return httpClient<{ success: boolean }>(`/turnos/${id}/permanent`, { method: 'DELETE' });
}
