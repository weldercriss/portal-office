import { httpClient } from '../../../api/httpClient';
import type {
  AdicionarTelegramGrupoInput,
  TelegramConfig,
  TelegramGrupoConectado,
  TelegramGrupoDetectado,
  TelegramNotificacaoTipo,
  UpdateTelegramConfigInput,
} from '../types/telegram-config.types';

export function getTelegramConfig() {
  return httpClient<TelegramConfig>('/telegram/config');
}

export function updateTelegramConfig(input: UpdateTelegramConfigInput) {
  return httpClient<TelegramConfig>('/telegram/config', { method: 'PUT', body: input });
}

export function getTelegramTipos() {
  return httpClient<TelegramNotificacaoTipo[]>('/telegram/tipos');
}

export function setTelegramTipoEnviar(tipo: string, campo: { enviar?: boolean; enviarGrupo?: boolean }) {
  return httpClient<TelegramNotificacaoTipo>(`/telegram/tipos/${tipo}`, { method: 'PUT', body: campo });
}

export function getGruposDetectados() {
  return httpClient<TelegramGrupoDetectado[]>('/telegram/grupos-detectados');
}

export function getGruposConectados() {
  return httpClient<TelegramGrupoConectado[]>('/telegram/grupos');
}

export function adicionarGrupoConectado(input: AdicionarTelegramGrupoInput) {
  return httpClient<TelegramGrupoConectado>('/telegram/grupos', { method: 'POST', body: input });
}

export function removerGrupoConectado(id: string) {
  return httpClient<{ ok: true }>(`/telegram/grupos/${id}`, { method: 'DELETE' });
}

export interface TestarTelegramResult {
  enviado: boolean;
  motivo?: string;
}

export function testarEnvioTelegram() {
  return httpClient<TestarTelegramResult>('/telegram/test', { method: 'POST' });
}
