export const OAUTH_COOKIE = 'agenda_google_oauth';

/**
 * Prefixo público do backend. Atrás do Caddy o navegador enxerga `/api`, que o
 * proxy remove antes de encaminhar; `COOKIE_PATH` já carrega esse prefixo.
 */
function prefixoPublico(): string {
  const base = process.env.COOKIE_PATH ?? '/auth/refresh';
  return base.replace(/\/auth\/refresh\/?$/, '');
}

/** O cookie precisa alcançar o callback e nada além dele. */
export function oauthCookieOptions() {
  return {
    path: `${prefixoPublico()}/agenda-google/oauth`,
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
  };
}
