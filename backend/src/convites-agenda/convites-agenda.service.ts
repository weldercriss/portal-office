import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConviteAgendaStatus } from '@prisma/client';
import { AgendaGoogleAutorizacaoPerdida } from '../agenda-google/agenda-google-oauth.service';
import { AgendaGoogleService } from '../agenda-google/agenda-google.service';
import { EventoAgenda, GoogleCalendarClient, eventIdDeterministico } from '../agenda-google/google-calendar.client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConviteAgendaDto, UpdateConviteAgendaDto, VerificarConviteAgendaDto } from './dto/convite-agenda.dto';

interface ConviteBase {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  inicio: Date;
  fim: Date;
}

export interface ColaboradorParaConvite {
  id: string;
  nome: string;
  email: string;
  disponivel: boolean;
}

export interface ConflitoConvite {
  titulo: string;
  inicio: string | null;
  fim: string | null;
}

export interface VerificacaoDestinatario {
  userId: string;
  disponivel: boolean;
  conflitos: ConflitoConvite[];
}

function calendarioAlvo(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary';
}

function urlPortal(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.CORS_ORIGIN ?? '').split(',')[0]?.trim() ?? '';
}

const INCLUDE_DETALHADO = {
  criadoPor: { select: { id: true, nome: true } },
  destinatarios: { include: { user: { select: { id: true, nome: true, email: true } } } },
} as const;

/**
 * Convites de agenda em massa: o admin monta um evento e o portal cria uma
 * cópia dele na agenda de cada destinatário conectado. Segue a mesma
 * disciplina dos plantões e reservas — sem organizador/convidados via Google,
 * porque não há delegação de domínio, só a autorização individual de cada
 * pessoa concedida em Meu perfil.
 */
@Injectable()
export class ConvitesAgendaService {
  private readonly logger = new Logger(ConvitesAgendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: GoogleCalendarClient,
    private readonly agendaGoogle: AgendaGoogleService,
  ) {}

  /** Colaboradores ativos e se estão prontos para receber um convite agora. */
  async colaboradores(): Promise<ColaboradorParaConvite[]> {
    const usuarios = await this.prisma.user.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    });
    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(usuarios.map((usuario) => usuario.id));
    return usuarios.map((usuario) => ({ ...usuario, disponivel: conexoes.has(usuario.id) }));
  }

  /**
   * Antes de criar, mostra o que já existe na agenda de cada destinatário no
   * intervalo pedido — a mesma divergência que o Google mostra ao convidar
   * alguém para um horário já ocupado.
   */
  async verificar(dto: VerificarConviteAgendaDto): Promise<VerificacaoDestinatario[]> {
    this.validarIntervalo(dto.inicio, dto.fim);
    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(dto.destinatarioIds);
    const calendarId = calendarioAlvo();

    return Promise.all(
      dto.destinatarioIds.map(async (userId): Promise<VerificacaoDestinatario> => {
        if (!conexoes.has(userId)) return { userId, disponivel: false, conflitos: [] };
        try {
          const eventos = await this.calendar.listarNoIntervalo(userId, calendarId, dto.inicio, dto.fim);
          return {
            userId,
            disponivel: true,
            conflitos: eventos.map((evento) => ({
              titulo: evento.summary,
              inicio: evento.start.dateTime ?? evento.start.date ?? null,
              fim: evento.end.dateTime ?? evento.end.date ?? null,
            })),
          };
        } catch (erro) {
          // Sem autorização, a pessoa já aparece como indisponível na listagem
          // de colaboradores; aqui só evita travar a checagem dos demais.
          if (erro instanceof AgendaGoogleAutorizacaoPerdida) return { userId, disponivel: false, conflitos: [] };
          this.logger.error(`Não foi possível checar conflitos de agenda de ${userId}`, erro as Error);
          return { userId, disponivel: true, conflitos: [] };
        }
      }),
    );
  }

  listar() {
    return this.prisma.conviteAgendaEvento.findMany({ orderBy: { criadoEm: 'desc' }, include: INCLUDE_DETALHADO });
  }

  async findOne(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: INCLUDE_DETALHADO });
    if (!convite) throw new NotFoundException('Convite não encontrado');
    return convite;
  }

  /** Cria o evento e envia uma cópia para a agenda de cada destinatário conectado. */
  async criar(dto: CreateConviteAgendaDto, criadoPorId: string) {
    this.validarIntervalo(dto.inicio, dto.fim);

    const convite = await this.prisma.conviteAgendaEvento.create({
      data: {
        titulo: dto.titulo.trim(),
        descricao: dto.descricao?.trim() || null,
        local: dto.local?.trim() || null,
        inicio: new Date(dto.inicio),
        fim: new Date(dto.fim),
        criadoPorId,
      },
    });

    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(dto.destinatarioIds);
    await Promise.all(dto.destinatarioIds.map((userId) => this.enviarPara(convite, userId, conexoes.get(userId))));

    return this.findOne(convite.id);
  }

  /**
   * Atualiza título/descrição/local/horário e reflete a mudança em quem já
   * tem o evento — o ID determinístico faz `enviarPara` atualizar em vez de
   * duplicar. Quem está `CANCELADO` fica de fora: editar não ressuscita um
   * convite retirado dessa pessoa. Destinatários em si não mudam aqui.
   */
  async atualizar(id: string, dto: UpdateConviteAgendaDto) {
    const atual = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: { destinatarios: true } });
    if (!atual) throw new NotFoundException('Convite não encontrado');

    const inicio = dto.inicio ?? atual.inicio.toISOString();
    const fim = dto.fim ?? atual.fim.toISOString();
    this.validarIntervalo(inicio, fim);

    const convite = await this.prisma.conviteAgendaEvento.update({
      where: { id },
      data: {
        titulo: dto.titulo?.trim(),
        descricao: dto.descricao !== undefined ? dto.descricao.trim() || null : undefined,
        local: dto.local !== undefined ? dto.local.trim() || null : undefined,
        inicio: dto.inicio ? new Date(dto.inicio) : undefined,
        fim: dto.fim ? new Date(dto.fim) : undefined,
      },
    });

    const alvo = atual.destinatarios.filter((destinatario) => destinatario.status !== ConviteAgendaStatus.CANCELADO);
    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(alvo.map((destinatario) => destinatario.userId));
    await Promise.all(
      alvo.map((destinatario) => this.enviarPara(convite, destinatario.userId, conexoes.get(destinatario.userId))),
    );

    return this.findOne(id);
  }

  /**
   * Tenta de novo só quem ficou de fora — sem conexão na hora ou falha
   * transitória do Google. Não mexe em quem já recebeu o evento.
   */
  async reenviar(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: { destinatarios: true } });
    if (!convite) throw new NotFoundException('Convite não encontrado');

    const pendentes = convite.destinatarios.filter((destinatario) => destinatario.status !== ConviteAgendaStatus.CRIADO);
    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(pendentes.map((destinatario) => destinatario.userId));
    await Promise.all(
      pendentes.map((destinatario) => this.enviarPara(convite, destinatario.userId, conexoes.get(destinatario.userId))),
    );

    return this.findOne(id);
  }

  /** Remove o evento de quem já o recebeu; quem falhou ou nunca teve conexão não precisa de nada. */
  async cancelar(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: { destinatarios: true } });
    if (!convite) throw new NotFoundException('Convite não encontrado');

    await Promise.all(
      convite.destinatarios
        .filter((destinatario) => destinatario.status === ConviteAgendaStatus.CRIADO && destinatario.calendarId && destinatario.eventId)
        .map(async (destinatario) => {
          try {
            await this.calendar.remover(destinatario.userId, destinatario.calendarId!, destinatario.eventId!);
          } catch (erro) {
            this.logger.error(`Não foi possível remover o evento de ${destinatario.userId}`, erro as Error);
          }
          await this.prisma.conviteAgendaDestinatario.update({
            where: { id: destinatario.id },
            data: { status: ConviteAgendaStatus.CANCELADO },
          });
        }),
    );

    return this.findOne(id);
  }

  private async enviarPara(
    convite: ConviteBase,
    userId: string,
    conexao: { googleSub: string; googleEmail: string } | undefined,
  ): Promise<void> {
    const chave = { conviteId_userId: { conviteId: convite.id, userId } };

    if (!conexao) {
      await this.prisma.conviteAgendaDestinatario.upsert({
        where: chave,
        create: { conviteId: convite.id, userId, status: ConviteAgendaStatus.INDISPONIVEL, erro: 'Agenda Google não conectada' },
        update: { status: ConviteAgendaStatus.INDISPONIVEL, erro: 'Agenda Google não conectada' },
      });
      return;
    }

    const calendarId = calendarioAlvo();
    try {
      const eventId = await this.calendar.criar(
        userId,
        calendarId,
        eventIdDeterministico(`convite:${convite.id}`, userId),
        this.montarEvento(convite),
      );
      const dados = {
        status: ConviteAgendaStatus.CRIADO,
        usuarioEmail: conexao.googleEmail,
        googleSub: conexao.googleSub,
        calendarId,
        eventId,
        erro: null,
      };
      await this.prisma.conviteAgendaDestinatario.upsert({
        where: chave,
        create: { conviteId: convite.id, userId, ...dados },
        update: dados,
      });
    } catch (erro) {
      const mensagem = erro instanceof AgendaGoogleAutorizacaoPerdida ? erro.motivo : erro instanceof Error ? erro.message : String(erro);
      await this.prisma.conviteAgendaDestinatario.upsert({
        where: chave,
        create: { conviteId: convite.id, userId, status: ConviteAgendaStatus.FALHA, erro: mensagem.slice(0, 300) },
        update: { status: ConviteAgendaStatus.FALHA, erro: mensagem.slice(0, 300) },
      });
    }
  }

  private montarEvento(convite: ConviteBase): EventoAgenda {
    const portal = urlPortal();
    const description = [
      convite.descricao?.trim() || null,
      portal ? `Convites de agenda: ${portal}/convites-agenda` : null,
      'Evento criado pelo portal. Alterações feitas aqui são sobrescritas se o convite for reenviado.',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      summary: convite.titulo,
      description,
      location: convite.local ?? undefined,
      // O front manda o instante já convertido (ISO com offset): não precisa de timeZone à parte.
      start: { dateTime: convite.inicio.toISOString() },
      end: { dateTime: convite.fim.toISOString() },
      extendedProperties: { private: { conviteAgendaId: convite.id, origem: 'portal-backoffice' } },
    };
  }

  private validarIntervalo(inicio: string, fim: string): void {
    if (new Date(inicio).getTime() >= new Date(fim).getTime()) {
      throw new BadRequestException('O fim do evento precisa ser depois do início.');
    }
  }
}
