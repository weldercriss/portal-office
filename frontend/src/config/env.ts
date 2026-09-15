export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_BASE_URL;
/** Vazio desliga o botao do Google e mantem apenas o login por senha. */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
