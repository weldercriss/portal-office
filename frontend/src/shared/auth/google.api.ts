import { httpClient } from '../../api/httpClient';

export type FinalidadeGoogle = 'LOGIN' | 'VINCULO';

export interface DesafioGoogle {
  nonce: string;
  expiraEm: string;
}

export interface VinculoGoogle {
  email: string;
  googleLinkedAt: string | null;
}

export function getGoogleStatus() {
  return httpClient<{ habilitado: boolean }>('/auth/google/status');
}

export function criarDesafioGoogle(finalidade: FinalidadeGoogle) {
  return httpClient<DesafioGoogle>('/auth/google/challenge', { method: 'POST', body: { finalidade } });
}

export function vincularContaGoogle(input: { credential: string; senha: string }) {
  return httpClient<VinculoGoogle>('/auth/google/link', { method: 'POST', body: input });
}
