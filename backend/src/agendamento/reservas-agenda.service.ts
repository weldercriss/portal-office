import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReservaStatus } from '@prisma/client';
import { AgendaGoogleAutorizacaoPerdida } from '../agenda-google/agenda-google-oauth.service';
import { AgendaGoogleService } from '../agenda-google/agenda-google.service';
import { EventoAgenda, GoogleCalendarClient, eventIdDeterministico } from '../agenda-google/google-calendar.client';
import { PrismaService } from '../prisma/prisma.service';

/** Falha isolada de uma pessoa: não impede as demais operações da reserva. */
export interface FalhaSincronizacao {
  userId: string;
  motivo: 'RECONEXAO' | 'TRANSITORIA';
  mensagem: string;
}

export interface ResultadoSincronizacao {
  falhas: FalhaSincronizacao[];
}

interface ReservaParaAgenda {
  id: string;
  data: Date;
  horaInicio: string;
  horaFim: string;
  titulo: string | null;
  observacoes: string | null;
  status: ReservaStatus;
  sala: { nome: string; localizacao: string | null };
  solicitante: { id: string; nome: string; email: string; ativo: boolean; agendaGoogleAtiva: boolean };
}

function fuso(): string {
  return process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || 'America/Sao_Paulo';
}

function calendarioAlvo(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary';
}

function urlPortal(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.CORS_ORIGIN ?? '').split(',')[0]?.trim() ?? '';
}

/** A reserva guarda o dia em UTC; o dia sai daqui sem passar pelo fuso do servidor. */
function diaUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDias(dia: string, quantidade: number): string {
  const base = new Date(`${dia}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + quantidade);
  return base.toISOString().slice(0, 10);
}

/** Namespace do ID determinístico: uma reserva nunca colide com um plantão. */
function chaveDoEvento(reservaId: string): string {
  return `reserva:${reservaId}`;
}

/** Monta o evento da reserva. Horário que vira a meia-noite termina no dia seguinte. */
export function montarEvento(reserva: ReservaParaAgenda): EventoAgenda {
  const dia = diaUtc(reserva.data);
  const diaFim = reserva.horaFim <= reserva.horaInicio ? somarDias(dia, 1) : dia;

  const titulo = reserva.titulo?.trim();
  const summary = titulo ? `${titulo} — ${reserva.sala.nome}` : `Sala reservada — ${reserva.sala.nome}`;

  const portal = urlPortal();
  const description = [
    `Sala: ${reserva.sala.nome}${reserva.sala.localizacao ? ` (${reserva.sala.localizacao})` : ''}`,
    reserva.observacoes?.trim() ? `Observações: ${reserva.observacoes.trim()}` : null,
    portal ? `Reservas: ${portal}/agendamentos` : null,
    'Evento criado pelo portal. Alterações feitas aqui são sobrescritas na próxima sincronização.',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary,
    description,
    start: { dateTime: `${dia}T${reserva.horaInicio}:00`, timeZone: fuso() },
    end: { dateTime: `${diaFim}T${reserva.horaFim}:00`, timeZone: fuso() },
    extendedProperties: { private: { reservaId: reserva.id, origem: 'portal-backoffice' } },
  };
}

/**
 * Espelha na agenda do solicitante a reserva de sala, reusando a autorização
 * individual já concedida em Meu perfil. Segue a mesma disciplina dos plantões:
 * a mutação só registra a pendência numa outbox e um worker reprocessa, para
 * que a agenda fora do ar nunca derrube a reserva.
 */
@Injectable()
export class ReservasAgendaService implements OnModuleInit {
  private readonly logger = new Logger(ReservasAgendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: GoogleCalendarClient,
    private readonly agendaGoogle: AgendaGoogleService,
  ) {}

  /** Reconectar a agenda precisa retomar também as reservas, não só os plantões. */
  onModuleInit(): void {
    this.agendaGoogle.registrarReprocessador((userId) => this.reprocessarDoUsuario(userId));
  }

  get habilitado(): boolean {
    return this.calendar.habilitado;
  }

  /**
   * Devolve à fila o que ficou parado esperando a autorização dessa pessoa e
   * as reservas futuras dela, que podem nunca ter chegado ao Google.
   */
  async reprocessarDoUsuario(userId: string): Promise<void> {
    if (!this.habilitado) return;

    await this.prisma.reservaSyncPendente.updateMany({
      where: { aguardandoReconexaoUserId: userId },
      data: { aguardandoReconexaoUserId: null, tentativas: 0, proximaTentativa: new Date(), ultimoErro: null },
    });

    const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const [futuras, comEvento] = await Promise.all([
      this.prisma.reserva.findMany({
        where: { solicitanteId: userId, data: { gte: hoje }, status: { not: ReservaStatus.CANCELADA } },
        select: { id: true },
      }),
      this.prisma.reservaEventoAgenda.findMany({ where: { userId }, select: { reservaId: true } }),
    ]);
    await this.enfileirar([...futuras.map((r) => r.id), ...comEvento.map((v) => v.reservaId)]);
  }

  /** Registra a pendência na outbox. Nunca lança: a reserva não pode falhar
   * porque a agenda está fora do ar. */
  async enfileirar(reservaIds: string[]): Promise<void> {
    if (!this.habilitado || reservaIds.length === 0) return;
    const agora = new Date();
    try {
      await this.prisma.$transaction(
        [...new Set(reservaIds)].map((reservaId) =>
          this.prisma.reservaSyncPendente.upsert({
            where: { reservaId },
            create: { reservaId },
            update: {
              proximaTentativa: agora,
              tentativas: 0,
              ultimoErro: null,
              aguardandoReconexaoUserId: null,
            },
          }),
        ),
      );
    } catch (erro) {
      this.logger.error(`Não foi possível enfileirar ${reservaIds.length} reserva(s) para a agenda`, erro as Error);
    }
  }

  /**
   * Deixa a agenda igual ao estado atual da reserva: cria, atualiza ou remove.
   * Serve também para reserva excluída, quando só resta apagar o evento.
   */
  async sincronizar(reservaId: string): Promise<ResultadoSincronizacao> {
    const [reserva, vinculos] = await Promise.all([
      this.prisma.reserva.findUnique({
        where: { id: reservaId },
        include: {
          sala: { select: { nome: true, localizacao: true } },
          solicitante: { select: { id: true, nome: true, email: true, ativo: true, agendaGoogleAtiva: true } },
        },
      }),
      this.prisma.reservaEventoAgenda.findMany({ where: { reservaId } }),
    ]);

    const destinatario = this.destinatario(reserva as ReservaParaAgenda | null);
    const falhas: FalhaSincronizacao[] = [];

    // Some da agenda de quem não é mais o solicitante, ou de todos se a reserva
    // foi cancelada, excluída ou perdeu a sincronização.
    for (const vinculo of vinculos) {
      if (destinatario && vinculo.userId === destinatario.id) continue;
      await this.limpar(vinculo, falhas);
    }

    if (!reserva || !destinatario) return { falhas };

    await this.publicar(reserva as ReservaParaAgenda, destinatario, vinculos, falhas);
    return { falhas };
  }

  private async limpar(
    vinculo: { id: string; userId: string; googleSub: string | null; calendarId: string; eventId: string },
    falhas: FalhaSincronizacao[],
  ): Promise<void> {
    const googleSub = await this.agendaGoogle.googleSubAtual(vinculo.userId);

    // Outra conta Google assumiu a conexão: apagar por ela atingiria a agenda
    // errada. Espera a reconexão da identidade que criou o evento.
    if (vinculo.googleSub && googleSub && googleSub !== vinculo.googleSub) {
      falhas.push({ userId: vinculo.userId, motivo: 'RECONEXAO', mensagem: 'identidade_google_diferente' });
      return;
    }

    try {
      await this.calendar.remover(vinculo.userId, vinculo.calendarId, vinculo.eventId);
      await this.prisma.reservaEventoAgenda.delete({ where: { id: vinculo.id } });
    } catch (erro) {
      falhas.push(this.classificar(vinculo.userId, erro));
    }
  }

  private async publicar(
    reserva: ReservaParaAgenda,
    destinatario: { id: string; email: string },
    vinculos: { id: string; userId: string; calendarId: string; eventId: string }[],
    falhas: FalhaSincronizacao[],
  ): Promise<void> {
    const conexao = await this.agendaGoogle.conexaoUtilizavel(destinatario.id);
    // Sem consentimento não há o que tentar: o perfil oferece a conexão.
    if (!conexao) return;

    const evento = montarEvento(reserva);
    const atual = vinculos.find((vinculo) => vinculo.userId === destinatario.id);

    try {
      if (atual) {
        const atualizado = await this.calendar.atualizar(destinatario.id, atual.calendarId, atual.eventId, evento);
        if (atualizado) {
          await this.prisma.reservaEventoAgenda.update({
            where: { id: atual.id },
            data: { usuarioEmail: destinatario.email, googleSub: conexao.googleSub },
          });
          return;
        }
        // A pessoa apagou o evento na própria agenda: recria.
        await this.prisma.reservaEventoAgenda.delete({ where: { id: atual.id } });
      }

      const calendarId = calendarioAlvo();
      const eventId = await this.calendar.criar(
        destinatario.id,
        calendarId,
        eventIdDeterministico(chaveDoEvento(reserva.id), destinatario.id),
        evento,
      );
      const dados = {
        usuarioEmail: destinatario.email,
        googleSub: conexao.googleSub,
        calendarId,
        eventId,
      };
      // Upsert: se o vínculo não gravou na tentativa anterior, o ID determinístico
      // reencontra o mesmo evento em vez de criar outro.
      await this.prisma.reservaEventoAgenda.upsert({
        where: { reservaId_userId: { reservaId: reserva.id, userId: destinatario.id } },
        create: { reservaId: reserva.id, userId: destinatario.id, ...dados },
        update: dados,
      });
    } catch (erro) {
      falhas.push(this.classificar(destinatario.id, erro));
    }
  }

  private classificar(userId: string, erro: unknown): FalhaSincronizacao {
    if (erro instanceof AgendaGoogleAutorizacaoPerdida) {
      return { userId, motivo: 'RECONEXAO', mensagem: erro.motivo };
    }
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    return { userId, motivo: 'TRANSITORIA', mensagem };
  }

  /** Quem recebe o evento: reserva viva, pessoa ativa e sincronização ligada. */
  private destinatario(reserva: ReservaParaAgenda | null) {
    if (!reserva || reserva.status === ReservaStatus.CANCELADA) return null;
    const solicitante = reserva.solicitante;
    if (!solicitante.ativo || !solicitante.agendaGoogleAtiva) return null;
    return solicitante;
  }
}
