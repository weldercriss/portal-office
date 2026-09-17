import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConviteAgendaEventoStatus, ConviteAgendaModo, ConviteAgendaResposta, ConviteAgendaStatus } from '@prisma/client';
import { AgendaGoogleAutorizacaoPerdida, normalizarEmail } from '../agenda-google/agenda-google-oauth.service';
import { AgendaGoogleService } from '../agenda-google/agenda-google.service';
import {
  ConviteAgendaConflitoRemoto,
  EventoAgenda,
  FreeBusyResultado,
  GoogleCalendarClient,
  eventIdDeterministico,
} from '../agenda-google/google-calendar.client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConviteAgendaDto, UpdateConviteAgendaDto, VerificarConviteAgendaDto } from './dto/convite-agenda.dto';

interface ConviteBase {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  inicio: Date;
  fim: Date;
  comMeet: boolean;
}

interface DestinatarioLegado {
  id: string;
  userId: string | null;
  status: ConviteAgendaStatus | null;
  calendarId: string | null;
  eventId: string | null;
}

export interface ColaboradorParaConvite {
  id: string;
  nome: string;
  email: string;
}

export interface OrganizadorStatus {
  conectado: boolean;
  email: string | null;
  precisaReconectar: boolean;
  podeConsultarDisponibilidade: boolean;
}

function calendarioAlvo(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary';
}

function urlPortal(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.CORS_ORIGIN ?? '').split(',')[0]?.trim() ?? '';
}

/** Domínios corporativos aceitos nos convites por e-mail. Vazio aceita qualquer domínio. */
function dominiosPermitidos(): string[] {
  return (process.env.GOOGLE_CALENDAR_INVITE_ALLOWED_DOMAINS ?? '')
    .split(',')
    .map((dominio) => dominio.trim().toLowerCase())
    .filter(Boolean);
}

const INCLUDE_DETALHADO = {
  criadoPor: { select: { id: true, nome: true } },
  destinatarios: { include: { user: { select: { id: true, nome: true, email: true } } } },
} as const;

/** Seção 7.1 do plano: responseStatus ausente ou não reconhecido vira DESCONHECIDO. */
const RESPOSTA_GOOGLE: Record<string, ConviteAgendaResposta> = {
  needsAction: ConviteAgendaResposta.PENDENTE,
  accepted: ConviteAgendaResposta.ACEITO,
  declined: ConviteAgendaResposta.RECUSADO,
  tentative: ConviteAgendaResposta.TALVEZ,
};

/**
 * Convites de agenda em massa. Dois modos convivem: o legado
 * (COPIAS_INDIVIDUAIS, uma cópia do evento por destinatário conectado) e o
 * atual (EVENTO_COM_CONVIDADOS, um único evento na agenda do organizador com
 * os destinatários como attendees por e-mail). Toda criação nova usa o modo
 * atual; ações sobre convites antigos continuam roteadas pelo modo salvo.
 */
@Injectable()
export class ConvitesAgendaService {
  private readonly logger = new Logger(ConvitesAgendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: GoogleCalendarClient,
    private readonly agendaGoogle: AgendaGoogleService,
  ) {}

  /** Colaboradores ativos: todos selecionáveis, sem depender de conexão individual. */
  async colaboradores(): Promise<ColaboradorParaConvite[]> {
    return this.prisma.user.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    });
  }

  /** Estado da conexão de quem vai organizar o evento único. */
  async organizadorStatus(userId: string): Promise<OrganizadorStatus> {
    const status = await this.agendaGoogle.statusDoUsuario(userId);
    const conectado = status.conexao === 'CONECTADA';
    return {
      conectado,
      email: conectado ? status.googleEmail : null,
      precisaReconectar: status.conexao === 'RECONECTAR',
      // A confirmação real vem da própria chamada de Free/Busy, que marca
      // DESCONHECIDO por item quando falta permissão — evita inspecionar a
      // string de escopos aqui.
      podeConsultarDisponibilidade: conectado,
    };
  }

  /**
   * Livre/ocupado de cada e-mail, consultado com o token do organizador — os
   * destinatários não precisam conectar nada (seção 6 do plano).
   */
  async verificar(dto: VerificarConviteAgendaDto, criadoPorId: string): Promise<FreeBusyResultado[]> {
    this.validarIntervalo(dto.inicio, dto.fim);
    const emails = [...new Set(dto.destinatarioEmails.map(normalizarEmail))];

    const conexao = await this.agendaGoogle.conexaoUtilizavel(criadoPorId);
    if (!conexao) return emails.map((email) => ({ email, status: 'DESCONHECIDO' as const, ocupado: [] }));

    return this.calendar.consultarLivreOcupado(criadoPorId, emails, dto.inicio, dto.fim);
  }

  listar() {
    return this.prisma.conviteAgendaEvento.findMany({ orderBy: { criadoEm: 'desc' }, include: INCLUDE_DETALHADO });
  }

  async findOne(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: INCLUDE_DETALHADO });
    if (!convite) throw new NotFoundException('Convite não encontrado');
    return convite;
  }

  /**
   * Cria o evento único na agenda do organizador e convida cada e-mail. Sai
   * desligado por padrão (GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED) até a
   * validação manual da Fase 0 do plano ser feita numa conta real.
   */
  async criar(dto: CreateConviteAgendaDto, criadoPorId: string) {
    if (process.env.GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED !== 'true') {
      throw new ServiceUnavailableException('Convites de agenda por e-mail ainda não foram habilitados');
    }
    this.validarIntervalo(dto.inicio, dto.fim);

    const conexao = await this.agendaGoogle.conexaoUtilizavel(criadoPorId);
    if (!conexao) throw new BadRequestException('Conecte a Agenda Google para enviar convites por e-mail');

    const organizador = await this.prisma.user.findUnique({ where: { id: criadoPorId }, select: { email: true } });
    const emailOrganizador = organizador ? normalizarEmail(organizador.email) : null;

    const emails = [...new Set(dto.destinatarioEmails.map(normalizarEmail))].filter((email) => email !== emailOrganizador);
    if (emails.length === 0) throw new BadRequestException('Informe pelo menos um destinatário válido');

    const permitidos = dominiosPermitidos();
    if (permitidos.length > 0) {
      const foraDoDominio = emails.filter((email) => !permitidos.includes(email.split('@')[1] ?? ''));
      if (foraDoDominio.length > 0) {
        throw new BadRequestException(`E-mail fora dos domínios permitidos: ${foraDoDominio.join(', ')}`);
      }
    }

    const colaboradoresAtivos = await this.colaboradores();
    const porEmail = new Map(colaboradoresAtivos.map((colaborador) => [normalizarEmail(colaborador.email), colaborador]));

    const convite = await this.prisma.$transaction(async (tx) => {
      const criado = await tx.conviteAgendaEvento.create({
        data: {
          titulo: dto.titulo.trim(),
          descricao: dto.descricao?.trim() || null,
          local: dto.local?.trim() || null,
          inicio: new Date(dto.inicio),
          fim: new Date(dto.fim),
          comMeet: dto.comMeet ?? true,
          criadoPorId,
          modo: ConviteAgendaModo.EVENTO_COM_CONVIDADOS,
          statusEvento: ConviteAgendaEventoStatus.PENDENTE,
          organizadorEmail: conexao.googleEmail,
          organizadorGoogleSub: conexao.googleSub,
        },
      });
      await tx.conviteAgendaDestinatario.createMany({
        data: emails.map((email) => {
          const colaborador = porEmail.get(email);
          return { conviteId: criado.id, email, userId: colaborador?.id, nome: colaborador?.nome };
        }),
      });
      return criado;
    });

    await this.enviarEventoCentral(convite, emails, criadoPorId);
    return this.findOne(convite.id);
  }

  /** Reflete título/descrição/local/horário; destinatários não mudam aqui. */
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
      include: { destinatarios: true },
    });

    if (convite.modo === ConviteAgendaModo.COPIAS_INDIVIDUAIS) return this.atualizarCopiasLegadas(convite);

    // Nunca houve envio (ficou FALHA antes de qualquer sucesso): só os dados
    // locais mudam agora — "reenviar" cuida da primeira tentativa de envio.
    if (!convite.eventId || !convite.calendarId) return this.findOne(id);

    try {
      await this.calendar.atualizarComConvidados(
        convite.criadoPorId,
        convite.calendarId,
        convite.eventId,
        this.montarEventoCentral(convite, convite.destinatarios.map((destinatario) => destinatario.email)),
      );
    } catch (erro) {
      this.logger.error(`Não foi possível atualizar o evento central do convite ${id}`, erro as Error);
    }
    return this.findOne(id);
  }

  /** Só age quando o modo atual ficou FALHA: repete a mesma criação (ID determinístico). */
  async reenviar(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: { destinatarios: true } });
    if (!convite) throw new NotFoundException('Convite não encontrado');

    if (convite.modo === ConviteAgendaModo.COPIAS_INDIVIDUAIS) return this.reenviarCopiasLegadas(convite);

    if (convite.statusEvento !== ConviteAgendaEventoStatus.FALHA) return this.findOne(id);
    await this.enviarEventoCentral(
      convite,
      convite.destinatarios.map((destinatario) => destinatario.email),
      convite.criadoPorId,
    );
    return this.findOne(id);
  }

  async cancelar(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id }, include: { destinatarios: true } });
    if (!convite) throw new NotFoundException('Convite não encontrado');

    if (convite.modo === ConviteAgendaModo.COPIAS_INDIVIDUAIS) return this.cancelarCopiasLegadas(convite);

    if (convite.eventId && convite.calendarId) {
      try {
        await this.calendar.cancelarComConvidados(convite.criadoPorId, convite.calendarId, convite.eventId);
      } catch (erro) {
        this.logger.error(`Não foi possível cancelar o evento central do convite ${id}`, erro as Error);
      }
    }

    await this.prisma.conviteAgendaEvento.update({
      where: { id },
      data: { statusEvento: ConviteAgendaEventoStatus.CANCELADO, canceladoEm: new Date() },
    });
    return this.findOne(id);
  }

  /** Busca o RSVP de cada destinatário no Google e atualiza o banco; não roda por linha da listagem. */
  async sincronizarRespostas(id: string) {
    const convite = await this.prisma.conviteAgendaEvento.findUnique({ where: { id } });
    if (!convite) throw new NotFoundException('Convite não encontrado');
    if (convite.modo !== ConviteAgendaModo.EVENTO_COM_CONVIDADOS || !convite.eventId || !convite.calendarId) {
      throw new BadRequestException('Este convite ainda não tem um evento enviado para sincronizar');
    }

    const remoto = await this.calendar.obterComConvidados(convite.criadoPorId, convite.calendarId, convite.eventId);
    if (remoto) {
      for (const attendee of remoto.attendees) {
        const email = normalizarEmail(attendee.email);
        const resposta = RESPOSTA_GOOGLE[attendee.responseStatus ?? ''] ?? ConviteAgendaResposta.DESCONHECIDO;
        await this.prisma.conviteAgendaDestinatario.updateMany({
          where: { conviteId: id, email },
          data: { resposta, respondidoEm: resposta === ConviteAgendaResposta.PENDENTE ? null : new Date() },
        });
      }
    }

    await this.prisma.conviteAgendaEvento.update({ where: { id }, data: { respostasSincronizadasEm: new Date() } });
    return this.findOne(id);
  }

  // --- Evento único (EVENTO_COM_CONVIDADOS) ---------------------------------

  private async enviarEventoCentral(convite: ConviteBase, emails: string[], criadoPorId: string): Promise<void> {
    const calendarId = calendarioAlvo();
    try {
      const eventId = await this.calendar.criarComConvidados(
        criadoPorId,
        calendarId,
        eventIdDeterministico(`convite-central:${convite.id}`, criadoPorId),
        this.montarEventoCentral(convite, emails),
        convite.id,
      );
      await this.prisma.conviteAgendaEvento.update({
        where: { id: convite.id },
        data: { statusEvento: ConviteAgendaEventoStatus.ENVIADO, calendarId, eventId, enviadoEm: new Date(), ultimoErro: null },
      });
    } catch (erro) {
      const mensagem = erro instanceof AgendaGoogleAutorizacaoPerdida || erro instanceof ConviteAgendaConflitoRemoto || erro instanceof Error
        ? erro.message
        : String(erro);
      this.logger.error(`Não foi possível enviar o evento central do convite ${convite.id}`, erro as Error);
      await this.prisma.conviteAgendaEvento.update({
        where: { id: convite.id },
        data: { statusEvento: ConviteAgendaEventoStatus.FALHA, ultimoErro: mensagem.slice(0, 300) },
      });
    }
  }

  private montarEventoCentral(convite: ConviteBase, emails: string[]): EventoAgenda {
    const portal = urlPortal();
    const description = [
      convite.descricao?.trim() || null,
      portal ? `Convites de agenda: ${portal}/convites-agenda` : null,
      'Evento criado pelo portal. Alterações feitas aqui são sobrescritas se o convite for reenviado ou editado.',
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
      attendees: emails.map((email) => ({ email })),
      // A lista de convidados fica oculta entre eles por padrão (seção 5.3 do plano).
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: false,
      extendedProperties: { private: { conviteAgendaId: convite.id, origem: 'portal-backoffice' } },
      ...(convite.comMeet && {
        conferenceData: { createRequest: { requestId: convite.id, conferenceSolutionKey: { type: 'hangoutsMeet' as const } } },
      }),
    };
  }

  // --- Modo legado (COPIAS_INDIVIDUAIS) -------------------------------------

  private async atualizarCopiasLegadas(convite: ConviteBase & { destinatarios: DestinatarioLegado[] }) {
    const alvo = convite.destinatarios.filter((destinatario) => destinatario.userId && destinatario.status !== ConviteAgendaStatus.CANCELADO);
    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(alvo.map((destinatario) => destinatario.userId!));
    await Promise.all(alvo.map((destinatario) => this.enviarParaCopiaLegada(convite, destinatario.userId!, conexoes.get(destinatario.userId!))));
    return this.findOne(convite.id);
  }

  private async reenviarCopiasLegadas(convite: ConviteBase & { destinatarios: DestinatarioLegado[] }) {
    const pendentes = convite.destinatarios.filter((destinatario) => destinatario.userId && destinatario.status !== ConviteAgendaStatus.CRIADO);
    const conexoes = await this.agendaGoogle.conexoesUtilizaveis(pendentes.map((destinatario) => destinatario.userId!));
    await Promise.all(pendentes.map((destinatario) => this.enviarParaCopiaLegada(convite, destinatario.userId!, conexoes.get(destinatario.userId!))));
    return this.findOne(convite.id);
  }

  private async cancelarCopiasLegadas(convite: { id: string; destinatarios: DestinatarioLegado[] }) {
    await Promise.all(
      convite.destinatarios
        .filter((destinatario) => destinatario.status === ConviteAgendaStatus.CRIADO && destinatario.userId && destinatario.calendarId && destinatario.eventId)
        .map(async (destinatario) => {
          try {
            await this.calendar.remover(destinatario.userId!, destinatario.calendarId!, destinatario.eventId!);
          } catch (erro) {
            this.logger.error(`Não foi possível remover o evento de ${destinatario.userId}`, erro as Error);
          }
          await this.prisma.conviteAgendaDestinatario.update({
            where: { id: destinatario.id },
            data: { status: ConviteAgendaStatus.CANCELADO },
          });
        }),
    );
    return this.findOne(convite.id);
  }

  private async enviarParaCopiaLegada(
    convite: ConviteBase,
    userId: string,
    conexao: { googleSub: string; googleEmail: string } | undefined,
  ): Promise<void> {
    const chave = { conviteId_userId: { conviteId: convite.id, userId } };

    if (!conexao) {
      await this.prisma.conviteAgendaDestinatario.update({
        where: chave,
        data: { status: ConviteAgendaStatus.INDISPONIVEL, erro: 'Agenda Google não conectada' },
      });
      return;
    }

    const calendarId = calendarioAlvo();
    try {
      const eventId = await this.calendar.criar(
        userId,
        calendarId,
        eventIdDeterministico(`convite:${convite.id}`, userId),
        this.montarEventoLegado(convite),
      );
      await this.prisma.conviteAgendaDestinatario.update({
        where: chave,
        data: { status: ConviteAgendaStatus.CRIADO, usuarioEmail: conexao.googleEmail, googleSub: conexao.googleSub, calendarId, eventId, erro: null },
      });
    } catch (erro) {
      const mensagem = erro instanceof AgendaGoogleAutorizacaoPerdida ? erro.motivo : erro instanceof Error ? erro.message : String(erro);
      await this.prisma.conviteAgendaDestinatario.update({
        where: chave,
        data: { status: ConviteAgendaStatus.FALHA, erro: mensagem.slice(0, 300) },
      });
    }
  }

  private montarEventoLegado(convite: ConviteBase): EventoAgenda {
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
      start: { dateTime: convite.inicio.toISOString() },
      end: { dateTime: convite.fim.toISOString() },
      extendedProperties: { private: { conviteAgendaId: convite.id, origem: 'portal-backoffice' } },
      ...(convite.comMeet && {
        conferenceData: { createRequest: { requestId: convite.id, conferenceSolutionKey: { type: 'hangoutsMeet' as const } } },
      }),
    };
  }

  private validarIntervalo(inicio: string, fim: string): void {
    if (new Date(inicio).getTime() >= new Date(fim).getTime()) {
      throw new BadRequestException('O fim do evento precisa ser depois do início.');
    }
  }
}
