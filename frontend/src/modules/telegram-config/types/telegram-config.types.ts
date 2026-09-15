export interface TelegramConfig {
  id: string | null;
  botToken: string;
  ativo: boolean;
}

export interface UpdateTelegramConfigInput {
  botToken: string;
  ativo?: boolean;
}

/** Grupo conectado: um evento com "enviarGrupo" ligado vai pra todos os grupos conectados. */
export interface TelegramGrupoConectado {
  id: string;
  chatId: string;
  topicId: string;
  nome: string | null;
  criadoEm: string;
}

export interface AdicionarTelegramGrupoInput {
  chatId: string;
  topicId?: string;
  nome?: string;
}

export interface TelegramNotificacaoTipo {
  id: string;
  tipo: string;
  nome: string;
  enviar: boolean;
  enviarGrupo: boolean;
  /** Só esses tipos hoje sabem montar um texto pro grupo (Agendamento de salas). */
  grupoDisponivel: boolean;
}

/** Grupo/tópico que o bot já viu via webhook, pra escolher com um clique. */
export interface TelegramGrupoDetectado {
  id: string;
  chatId: string;
  chatTitle: string | null;
  topicId: string;
  vistoEm: string;
}
