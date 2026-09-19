import { API_BASE_URL } from '../config/env';

/** avatarUrl pode ser a foto do Google (URL absoluta) ou o upload local (caminho relativo da API). */
export function resolverAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE_URL}${avatarUrl}`;
}
