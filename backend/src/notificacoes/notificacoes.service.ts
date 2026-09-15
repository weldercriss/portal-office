import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { NotificacoesGateway } from './notificacoes.gateway';

export interface CriarNotificacaoInput {
  userId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  /** Texto alternativo pro Telegram (com emoji/formatação); se omitido, usa titulo+mensagem. */
  telegramTexto?: string;
  /** Falso pula o envio por Telegram (in-app continua). Usado quando quem recebe optou por não ser avisado ali. */
  enviarTelegram?: boolean;
  /**
   * Texto HTML pro grupo/tópico do Telegram (ver reserva-telegram.util.ts). Presente aqui
   * dispara o post no grupo — independente de `enviarTelegram`, que só controla a DM pessoal.
   */
  telegramGrupoTexto?: string;
}

@Injectable()
export class NotificacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificacoesGateway,
    private readonly telegramService: TelegramService,
  ) {}

  findMinhas(userId: string) {
    return this.prisma.notificacao.findMany({
      where: { userId },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });
  }

  async contarNaoLidas(userId: string) {
    const total = await this.prisma.notificacao.count({ where: { userId, lida: false } });
    return { total };
  }

  async marcarComoLida(id: string, userId: string) {
    const notificacao = await this.prisma.notificacao.findUnique({ where: { id } });
    if (!notificacao || notificacao.userId !== userId) throw new NotFoundException('Notificação não encontrada');
    return this.prisma.notificacao.update({ where: { id }, data: { lida: true } });
  }

  async marcarTodasComoLidas(userId: string) {
    await this.prisma.notificacao.updateMany({ where: { userId, lida: false }, data: { lida: true } });
    return { ok: true };
  }

  async limparTodas(userId: string) {
    await this.prisma.notificacao.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async criar(input: CriarNotificacaoInput) {
    const { telegramTexto, enviarTelegram, telegramGrupoTexto, ...dadosNotificacao } = input;
    const notificacao = await this.prisma.notificacao.create({ data: dadosNotificacao });
    await this.gateway.emitParaUsuario(input.userId, notificacao);
    if (enviarTelegram !== false) {
      void this.telegramService.enviar(
        input.tipo,
        input.userId,
        telegramTexto ?? `${input.titulo}\n${input.mensagem}`,
      );
    }
    if (telegramGrupoTexto) {
      void this.telegramService.enviarGrupo(input.tipo, telegramGrupoTexto);
    }
    return notificacao;
  }

  async criarParaAdmins(input: Omit<CriarNotificacaoInput, 'userId'>, excetoUserId?: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', ativo: true, ...(excetoUserId ? { id: { not: excetoUserId } } : {}) },
      select: { id: true },
    });
    await Promise.all(admins.map((admin) => this.criar({ ...input, userId: admin.id })));
  }
}
