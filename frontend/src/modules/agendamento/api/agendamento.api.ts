import { httpClient } from '../../../api/httpClient';
import type {
  AgendamentoConfig,
  CreateReservaColaboradorInput,
  CreateReservaInput,
  CreateSalaInput,
  FiltrosReserva,
  HorarioDisponivel,
  Reserva,
  Sala,
  UpdateReservaInput,
  UpdateSalaInput,
} from '../types/agendamento.types';

/** v1 é o contrato do painel interno; integrações com outros portais entram na v2. */
const BASE = '/v1/agendamento';

export function getAgendamentoConfig() {
  return httpClient<AgendamentoConfig>(`${BASE}/config`);
}

export function updateAgendamentoConfig(input: AgendamentoConfig) {
  return httpClient<AgendamentoConfig>(`${BASE}/config`, { method: 'PUT', body: input });
}

function query(params: Record<string, string | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor) busca.set(chave, valor);
  }
  const texto = busca.toString();
  return texto ? `?${texto}` : '';
}

export function getSalas(all = false) {
  return httpClient<Sala[]>(`${BASE}/salas${all ? '?all=true' : ''}`);
}

export function createSala(input: CreateSalaInput) {
  return httpClient<Sala>(`${BASE}/salas`, { method: 'POST', body: input });
}

export function updateSala(id: string, input: UpdateSalaInput) {
  return httpClient<Sala>(`${BASE}/salas/${id}`, { method: 'PATCH', body: input });
}

export function deactivateSala(id: string) {
  return httpClient<Sala>(`${BASE}/salas/${id}`, { method: 'DELETE' });
}

export function deleteSalaPermanently(id: string) {
  return httpClient<{ success: boolean }>(`${BASE}/salas/${id}/permanent`, { method: 'DELETE' });
}

/** Horários da sala no dia, já marcando o que outra reserva tomou. */
export function getHorarios(salaId: string, data: string, ignorarReservaId?: string) {
  return httpClient<HorarioDisponivel[]>(`${BASE}/salas/${salaId}/horarios${query({ data, ignorarReservaId })}`);
}

export function getReservas(filtros: FiltrosReserva = {}) {
  return httpClient<Reserva[]>(`${BASE}/reservas${query({ ...filtros })}`);
}

export function getMinhasReservas(filtros: Omit<FiltrosReserva, 'solicitanteId'> = {}) {
  return httpClient<Reserva[]>(`${BASE}/reservas/minhas${query({ ...filtros })}`);
}

export function createReserva(input: CreateReservaInput) {
  return httpClient<Reserva>(`${BASE}/reservas`, { method: 'POST', body: input });
}

export function createMinhaReserva(input: CreateReservaColaboradorInput) {
  return httpClient<Reserva>(`${BASE}/reservas/minhas`, { method: 'POST', body: input });
}

export function updateReserva(id: string, input: UpdateReservaInput) {
  return httpClient<Reserva>(`${BASE}/reservas/${id}`, { method: 'PATCH', body: input });
}

/** Cancelar preserva o registro e libera o horário; excluir apaga o histórico. */
export function cancelarReserva(id: string, motivoCancelamento?: string) {
  return httpClient<Reserva>(`${BASE}/reservas/${id}/cancelar`, {
    method: 'POST',
    body: { motivoCancelamento },
  });
}

export function cancelarMinhaReserva(id: string) {
  return httpClient<Reserva>(`${BASE}/reservas/${id}/cancelar-minha`, { method: 'POST' });
}

export function deleteReserva(id: string) {
  return httpClient<{ success: boolean }>(`${BASE}/reservas/${id}`, { method: 'DELETE' });
}
