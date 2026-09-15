import { httpClient } from '../../../api/httpClient';

/** Autorização individual da pessoa; nenhum token do Google chega ao navegador. */
export type ConexaoAgendaGoogle = 'NAO_CONECTADA' | 'CONECTADA' | 'RECONECTAR';

export interface StatusAgendaGoogle {
  /** Configuração global do servidor. */
  habilitado: boolean;
  /** Preferência de sincronização da pessoa. */
  ativa: boolean;
  conexao: ConexaoAgendaGoogle;
  googleEmail: string | null;
  /** Ainda existem eventos criados pelo portal esperando remoção. */
  limpezaPendente: boolean;
}

export function getStatusAgendaGoogle() {
  return httpClient<StatusAgendaGoogle>('/agenda-google/status');
}

export function definirPreferenciaAgendaGoogle(ativa: boolean) {
  return httpClient<StatusAgendaGoogle>('/agenda-google/preferencia', { method: 'PATCH', body: { ativa } });
}

/** Devolve a URL de consentimento do Google para o navegador seguir. */
export function iniciarConexaoAgendaGoogle() {
  return httpClient<{ url: string }>('/agenda-google/oauth/iniciar', { method: 'POST' });
}

export function desconectarAgendaGoogle() {
  return httpClient<StatusAgendaGoogle>('/agenda-google/conexao', { method: 'DELETE' });
}
