import { httpClient } from '../../../api/httpClient';
import type {
  ColaboradorParaConvite,
  ConviteAgenda,
  CreateConviteAgendaInput,
  UpdateConviteAgendaInput,
  VerificacaoDestinatario,
  VerificarConviteAgendaInput,
} from '../types/convite-agenda.types';

const BASE = '/convites-agenda';

export function getColaboradoresParaConvite() {
  return httpClient<ColaboradorParaConvite[]>(`${BASE}/colaboradores`);
}

export function getConvitesAgenda() {
  return httpClient<ConviteAgenda[]>(BASE);
}

export function getConviteAgenda(id: string) {
  return httpClient<ConviteAgenda>(`${BASE}/${id}`);
}

/** Só consulta o que já existe na agenda de cada destinatário; não cria nada. */
export function verificarConviteAgenda(input: VerificarConviteAgendaInput) {
  return httpClient<VerificacaoDestinatario[]>(`${BASE}/verificar`, { method: 'POST', body: input });
}

export function createConviteAgenda(input: CreateConviteAgendaInput) {
  return httpClient<ConviteAgenda>(BASE, { method: 'POST', body: input });
}

export function updateConviteAgenda(id: string, input: UpdateConviteAgendaInput) {
  return httpClient<ConviteAgenda>(`${BASE}/${id}`, { method: 'PATCH', body: input });
}

export function reenviarConviteAgenda(id: string) {
  return httpClient<ConviteAgenda>(`${BASE}/${id}/reenviar`, { method: 'POST' });
}

export function cancelarConviteAgenda(id: string) {
  return httpClient<ConviteAgenda>(`${BASE}/${id}/cancelar`, { method: 'POST' });
}
