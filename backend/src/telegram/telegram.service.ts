import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdicionarTelegramGrupoDto } from './dto/adicionar-telegram-grupo.dto';
import { UpdateTelegramConfigDto } from './dto/update-telegram-config.dto';
import { UpdateTelegramTipoDto } from './dto/update-telegram-tipo.dto';

interface TelegramUpdate {
  message?: {
    text?: string;
    message_thread_id?: number;
    is_topic_message?: boolean;
    from?: { username?: string };
    chat?: { id?: number | string; type?: string; title?: string };
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tipos que hoje sabem montar um texto pro grupo (ver reserva-telegram.util.ts). */
const TIPOS_COM_GRUPO = new Set([
  'RESERVA_SALA_CRIADA',
  'RESERVA_SALA_CONFIRMADA',
  'RESERVA_SALA_ATUALIZADA',
  'RESERVA_SALA_CANCELADA',
  'RESERVA_SALA_LEMBRETE',
  'RESERVA_SALA_LEMBRETE_FIM',
]);

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botUsernameCache: { token: string; username: string } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.telegramConfig.findFirst();
    return config ?? { id: null, botToken: '', ativo: false };
  }

  async setConfig(dto: UpdateTelegramConfigDto) {
    const atual = await this.prisma.telegramConfig.findFirst();
    if (atual) {
      return this.prisma.telegramConfig.update({ where: { id: atual.id }, data: dto });
    }
    return this.prisma.telegramConfig.create({ data: { botToken: dto.botToken, ativo: dto.ativo ?? true } });
  }

  /** Grupos conectados, mais antigo primeiro — um evento com "enviarGrupo" vai pra todos eles. */
  listarGrupos() {
    return this.prisma.telegramGrupoConectado.findMany({ orderBy: { criadoEm: 'asc' } });
  }

  /** Conecta mais um grupo/tópico (visto via webhook ou digitado à mão) ao envio de eventos em grupo. */
  async adicionarGrupo(dto: AdicionarTelegramGrupoDto) {
    const atual = await this.prisma.telegramConfig.findFirst();
    if (!atual) {
      throw new BadRequestException('Configure e salve o token do bot antes de conectar um grupo.');
    }
    return this.prisma.telegramGrupoConectado.upsert({
      where: { chatId_topicId: { chatId: dto.chatId, topicId: dto.topicId || '' } },
      update: { nome: dto.nome || null },
      create: { chatId: dto.chatId, topicId: dto.topicId || '', nome: dto.nome || null },
    });
  }

  async removerGrupo(id: string) {
    const grupo = await this.prisma.telegramGrupoConectado.findUnique({ where: { id } });
    if (!grupo) throw new NotFoundException('Grupo não encontrado');
    await this.prisma.telegramGrupoConectado.delete({ where: { id } });
    return { ok: true };
  }

  /** Grupos/tópicos que o bot já viu via webhook, mais recentes primeiro — pro admin escolher com um clique. */
  listarGruposDetectados() {
    return this.prisma.telegramGrupoDetectado.findMany({ orderBy: { vistoEm: 'desc' }, take: 20 });
  }

  async listTipos() {
    const tipos = await this.prisma.telegramNotificacaoTipo.findMany({ orderBy: { nome: 'asc' } });
    return tipos.map((tipo) => ({ ...tipo, grupoDisponivel: TIPOS_COM_GRUPO.has(tipo.tipo) }));
  }

  setTipoEnviar(tipo: string, dto: UpdateTelegramTipoDto) {
    const data: { enviar?: boolean; enviarGrupo?: boolean } = {};
    if (dto.enviar !== undefined) data.enviar = dto.enviar;
    if (dto.enviarGrupo !== undefined) data.enviarGrupo = dto.enviarGrupo;
    return this.prisma.telegramNotificacaoTipo.update({ where: { tipo }, data });
  }

  /** Fire-and-forget: uma falha aqui nunca deve derrubar o fluxo principal de notificação. */
  async enviar(tipo: string, userId: string, texto: string) {
    try {
      const [config, tipoConfig, user] = await Promise.all([
        this.prisma.telegramConfig.findFirst(),
        this.prisma.telegramNotificacaoTipo.findUnique({ where: { tipo } }),
        this.prisma.user.findUnique({ where: { id: userId } }),
      ]);
      if (!config?.ativo || !config.botToken) return;
      if (!tipoConfig?.enviar) return;
      if (!user?.telegramChatId) return;

      const resultado = await this.enviarMensagem(config.botToken, user.telegramChatId, texto);
      if (!resultado.ok) {
        this.logger.warn(`Falha ao notificar usuário ${userId} via Telegram: ${this.mensagemAmigavel(resultado)}`);
      }
    } catch (error) {
      this.logger.warn(`Falha ao enviar notificação via Telegram: ${(error as Error).message}`);
    }
  }

  /** Fire-and-forget: posta em todos os grupos conectados, só se o tipo tiver isso ligado. */
  async enviarGrupo(tipo: string, texto: string) {
    try {
      const [config, tipoConfig, grupos] = await Promise.all([
        this.prisma.telegramConfig.findFirst(),
        this.prisma.telegramNotificacaoTipo.findUnique({ where: { tipo } }),
        this.prisma.telegramGrupoConectado.findMany(),
      ]);
      if (!config?.ativo || !config.botToken || grupos.length === 0) return;
      if (!tipoConfig?.enviarGrupo) return;

      for (const grupo of grupos) {
        const resultado = await this.enviarMensagem(config.botToken, grupo.chatId, texto, {
          threadId: grupo.topicId || undefined,
          parseMode: 'HTML',
        });
        if (!resultado.ok) {
          this.logger.warn(
            `Falha ao postar no grupo ${grupo.chatId} do Telegram (tipo ${tipo}): ${this.mensagemAmigavel(resultado)}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Falha ao postar no grupo do Telegram: ${(error as Error).message}`);
    }
  }

  /** Disparo manual de teste, chamado pelo admin em "Configurações" — aqui o erro deve aparecer na tela, não só no log. */
  async enviarTeste(userId: string): Promise<{ enviado: boolean; motivo?: string }> {
    const [config, user] = await Promise.all([
      this.prisma.telegramConfig.findFirst(),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!config?.ativo || !config.botToken) {
      return { enviado: false, motivo: 'Configure e ative o bot do Telegram antes de testar.' };
    }
    if (!user?.telegramChatId) {
      return {
        enviado: false,
        motivo: 'Você ainda não iniciou uma conversa com o bot. Mande "/start" para ele no Telegram e tente de novo.',
      };
    }

    const resultado = await this.enviarMensagem(
      config.botToken,
      user.telegramChatId,
      [
        '🧪 TESTE — Simulação de evento',
        '',
        '🔔 Novo plantão vinculado!',
        'Você foi vinculado a um plantão de exemplo.',
        '📅 Data: ' + new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        '',
        'Esta é uma simulação de notificação do Portal BackOffice. Nenhum plantão foi criado ou alterado.',
      ].join('\n'),
    );
    if (!resultado.ok) {
      return { enviado: false, motivo: this.mensagemAmigavel(resultado) };
    }
    return { enviado: true };
  }

  private async enviarMensagem(
    botToken: string,
    chatId: string,
    texto: string,
    opcoes?: { threadId?: string; parseMode?: 'HTML' },
  ): Promise<{ ok: true } | { ok: false; status: number | null; descricao: string }> {
    try {
      const corpo: Record<string, unknown> = { chat_id: chatId, text: texto };
      if (opcoes?.threadId) corpo.message_thread_id = Number(opcoes.threadId);
      if (opcoes?.parseMode) corpo.parse_mode = opcoes.parseMode;

      const resposta = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const corpoTexto = await resposta.text();
        let descricao = corpoTexto;
        try {
          const corpo = JSON.parse(corpoTexto) as { description?: string };
          if (corpo.description) descricao = corpo.description;
        } catch {
          // corpo não é JSON — mantém o texto bruto como descrição
        }
        return { ok: false, status: resposta.status, descricao };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, status: null, descricao: (error as Error).message };
    }
  }

  /** Traduz a resposta de erro do Telegram numa mensagem que o admin consegue agir em cima. */
  private mensagemAmigavel(erro: { status: number | null; descricao: string }): string {
    const { status, descricao } = erro;
    if (status === 401) {
      return 'O token do bot é inválido ou foi revogado. Gere um novo em @BotFather e salve em Configurações > Telegram.';
    }
    if (status === 403 && /blocked/i.test(descricao)) {
      return 'O colaborador bloqueou o bot no Telegram. Peça para desbloquear e enviar "/start" de novo.';
    }
    if (status === 400 && /chat not found/i.test(descricao)) {
      return 'Chat não encontrado no Telegram. O colaborador precisa enviar "/start" para o bot antes do primeiro envio.';
    }
    if (status === 429) {
      return 'O Telegram limitou os envios do bot por excesso de mensagens. Aguarde alguns instantes e tente de novo.';
    }
    if (status === null) {
      return `Não foi possível conectar ao Telegram: ${descricao}`;
    }
    return `O Telegram recusou o envio (erro ${status}): ${descricao}`;
  }

  /** Link individual (t.me/bot?start=<id>) que a própria pessoa abre para vincular o chat, sem digitar nada. */
  async getLinkDeConexao(userId: string): Promise<{ link: string | null; motivo?: string }> {
    const config = await this.prisma.telegramConfig.findFirst();
    if (!config?.ativo || !config.botToken) {
      return { link: null, motivo: 'A integração com Telegram ainda não foi configurada pelo administrador.' };
    }
    const username = await this.getBotUsername(config.botToken);
    if (!username) {
      return { link: null, motivo: 'Não foi possível obter os dados do bot no Telegram. Avise o administrador.' };
    }
    return { link: `https://t.me/${username}?start=${userId}` };
  }

  private async getBotUsername(botToken: string): Promise<string | null> {
    if (this.botUsernameCache?.token === botToken) return this.botUsernameCache.username;
    try {
      const resposta = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      if (!resposta.ok) return null;
      const corpo = (await resposta.json()) as { result?: { username?: string } };
      const username = corpo.result?.username;
      if (!username) return null;
      this.botUsernameCache = { token: botToken, username };
      return username;
    } catch {
      return null;
    }
  }

  /**
   * Recebe os updates do bot (via webhook). Trata `/id` (qualquer chat), detecta
   * grupos/tópicos onde o bot foi adicionado, e — em chat privado — prioriza o id
   * embutido no link pessoal (/start <userId>), caindo pro username cadastrado só
   * como compatibilidade. Uma falha aqui nunca deve derrubar o endpoint do webhook.
   */
  async processarWebhook(update: TelegramUpdate) {
    try {
      const mensagem = update.message;
      const chat = mensagem?.chat;
      if (chat?.id === undefined) return;

      const chatId = String(chat.id);
      const ehGrupo = chat.type === 'group' || chat.type === 'supergroup';
      const topicId = mensagem?.is_topic_message && mensagem.message_thread_id ? String(mensagem.message_thread_id) : '';

      if (/^\/id(?:@\w+)?$/.test(mensagem?.text?.trim() ?? '')) {
        await this.responderId(chatId, topicId, ehGrupo);
      }

      if (ehGrupo) {
        await this.prisma.telegramGrupoDetectado.upsert({
          where: { chatId_topicId: { chatId, topicId } },
          update: { chatTitle: chat.title ?? null },
          create: { chatId, chatTitle: chat.title ?? null, topicId },
        });
        return;
      }

      const idDoLink = mensagem?.text?.match(/^\/start(?:@\w+)?\s+(\S+)/)?.[1];
      if (idDoLink && UUID_RE.test(idDoLink)) {
        const usuario = await this.prisma.user.findUnique({ where: { id: idDoLink } });
        if (usuario) {
          await this.prisma.user.update({ where: { id: usuario.id }, data: { telegramChatId: chatId } });
          return;
        }
      }

      const username = mensagem?.from?.username;
      if (!username) return;
      const normalizado = username.toLowerCase();
      const usuarios = await this.prisma.user.findMany({ where: { telegramUsername: { not: null } } });
      const encontrado = usuarios.find((u) => u.telegramUsername?.replace(/^@/, '').toLowerCase() === normalizado);
      if (encontrado) {
        await this.prisma.user.update({ where: { id: encontrado.id }, data: { telegramChatId: chatId } });
      }
    } catch (error) {
      this.logger.warn(`Falha ao processar update do webhook do Telegram: ${(error as Error).message}`);
    }
  }

  /** Responde no próprio chat/tópico com o chat_id (e topic_id, se houver) — pra configurar o grupo sem digitar números às cegas. */
  private async responderId(chatId: string, topicId: string, ehGrupo: boolean) {
    const config = await this.prisma.telegramConfig.findFirst();
    if (!config?.botToken) return;

    const linhas = [ehGrupo ? '👥 Este grupo' : '👤 Esta conversa', `chat_id: ${chatId}`];
    if (topicId) linhas.push(`topic_id: ${topicId}`);
    await this.enviarMensagem(config.botToken, chatId, linhas.join('\n'), { threadId: topicId || undefined });
  }
}
