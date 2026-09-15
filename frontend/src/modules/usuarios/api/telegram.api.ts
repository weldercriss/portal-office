import { httpClient } from '../../../api/httpClient';

export interface LinkTelegram {
  link: string | null;
  motivo?: string;
}

/** Link pessoal (t.me/bot?start=id) pra vincular o Telegram com um clique, sem digitar nada. */
export function getLinkTelegram() {
  return httpClient<LinkTelegram>('/telegram/connect-link');
}
