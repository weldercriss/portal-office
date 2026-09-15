import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaGoogleAutorizacaoPerdida, AgendaGoogleOAuthService } from './agenda-google-oauth.service';
import { EventoAgenda, GoogleCalendarClient, eventIdDeterministico } from './google-calendar.client';

interface PlantaoParaAgenda {
  id: string;
  nome: string | null;
  data: Date;
  status: string;
  tipoPlantao: { nome: string; horaInicio: string; horaFim: string } | null;
  user: { id: string; nome: string; email: string; ativo: boolean; agendaGoogleAtiva: boolean } | null;
}

/** Falha isolada de uma pessoa: não impede as demais operações do plantão. */
export interface FalhaSincronizacao {
  userId: string;
  motivo: 'RECONEXAO' | 'TRANSITORIA';
  mensagem: string;
}

export interface ResultadoSincronizacao {
  falhas: FalhaSincronizacao[];
}

export type EstadoConexaoAgenda = 'NAO_CONECTADA' | 'CONECTADA' | 'RECONECTAR';

export interface StatusAgendaGoogle {
  habilitado: boolean;
  ativa: boolean;
  conexao: EstadoConexaoAgenda;
  googleEmail: string | null;
  limpezaPendente: boolean;
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

/** O plantão guarda a data em UTC; o dia sai daqui sem passar pelo fuso do servidor. */
function diaUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDias(dia: string, quantidade: number): string {
  const base = new Date(`${dia}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + quantidade);
  return base.toISOString().slice(0, 10);
}

function normalizarHora(valor?: string | null): string | null {
  const casado = valor?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!casado) return null;
  const hora = Number(casado[1]);
  const minuto = Number(casado[2]);
  if (hora > 23 || minuto > 59) return null;
  return `${String(hora).padStart(2, '0')}:${casado[2]}:00`;
}

/** Monta o evento do plantão. Tipo ausente ou horário inválido vira evento de dia inteiro. */
export function montarEvento(plantao: PlantaoParaAgenda): EventoAgenda {
  const dia = diaUtc(plantao.data);
  const inicio = normalizarHora(plantao.tipoPlantao?.horaInicio);
  const fim = normalizarHora(plantao.tipoPlantao?.horaFim);

  const titulo = plantao.nome?.trim();
  const summary = titulo || `Plantão${plantao.tipoPlantao ? ` — ${plantao.tipoPlantao.nome}` : ''}`;

  const portal = urlPortal();
  const description = [
    plantao.tipoPlantao
      ? `Tipo: ${plantao.tipoPlantao.nome} (${plantao.tipoPlantao.horaInicio} às ${plantao.tipoPlantao.horaFim})`
      : null,
    portal ? `Escala completa: ${portal}/plantoes` : null,
    'Evento criado pelo portal. Alterações feitas aqui são sobrescritas na próxima sincronização.',
  ]
    .filter(Boolean)
    .join('\n');

  const extendedProperties = { private: { plantaoId: plantao.id, origem: 'portal-backoffice' } };

  if (!inicio || !fim) {
    // `end.date` do Google é exclusivo: um dia inteiro termina no dia seguinte.
    return { summary, description, start: { date: dia }, end: { date: somarDias(dia, 1) }, extendedProperties };
  }

  // Horário que vira a meia-noite termina no dia seguinte.
  const diaFim = fim <= inicio ? somarDias(dia, 1) : dia;
  return {
    summary,
    description,
    start: { dateTime: `${dia}T${inicio}`, timeZone: fuso() },
    end: { dateTime: `${diaFim}T${fim}`, timeZone: fuso() },
    extendedProperties,
  };
}

@Injectable()
export class AgendaGoogleService {
  private readonly logger = new Logger(AgendaGoogleService.name);
  private readonly reprocessadores: ((userId: string) => Promise<void>)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: GoogleCalendarClient,
    private readonly oauth: AgendaGoogleOAuthService,
  ) {}

  get habilitado(): boolean {
    return this.calendar.habilitado;
  }

  /**
   * Registra a pendência na outbox. Nunca lança: a escala não pode falhar
   * porque a agenda está fora do ar.
   */
  async enfileirar(plantaoIds: string[]): Promise<void> {
    if (!this.habilitado || plantaoIds.length === 0) return;
    const agora = new Date();
    try {
      await this.prisma.$transaction(
        [...new Set(plantaoIds)].map((plantaoId) =>
          this.prisma.agendaSyncPendente.upsert({
            where: { plantaoId },
            create: { plantaoId },
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
      this.logger.error(`Não foi possível enfileirar ${plantaoIds.length} plantão(ões) para a agenda`, erro as Error);
    }
  }

  /**
   * Deixa a agenda igual ao estado atual do plantão: cria, atualiza ou remove.
   * Serve também para plantão excluído, quando só resta apagar o evento.
   *
   * As operações são independentes: quem perdeu a autorização não impede a
   * criação do evento de quem assumiu o plantão.
   */
  async sincronizar(plantaoId: string): Promise<ResultadoSincronizacao> {
    const [plantao, vinculos] = await Promise.all([
      this.prisma.plantao.findUnique({
        where: { id: plantaoId },
        include: {
          tipoPlantao: { select: { nome: true, horaInicio: true, horaFim: true } },
          user: { select: { id: true, nome: true, email: true, ativo: true, agendaGoogleAtiva: true } },
        },
      }),
      this.prisma.plantaoEventoAgenda.findMany({ where: { plantaoId } }),
    ]);

    const destinatario = this.destinatario(plantao as PlantaoParaAgenda | null);
    const falhas: FalhaSincronizacao[] = [];

    // Some da agenda de quem não é mais o plantonista, ou de todos se o
    // plantão virou rascunho, perdeu o vínculo ou foi excluído.
    for (const vinculo of vinculos) {
      if (destinatario && vinculo.userId === destinatario.id) continue;
      await this.limpar(vinculo, falhas);
    }

    if (!plantao || !destinatario) return { falhas };

    await this.publicar(plantao as PlantaoParaAgenda, destinatario, vinculos, falhas);
    return { falhas };
  }

  private async limpar(
    vinculo: { id: string; userId: string; googleSub: string | null; calendarId: string; eventId: string },
    falhas: FalhaSincronizacao[],
  ): Promise<void> {
    const conexao = await this.oauth.conexaoDoUsuario(vinculo.userId);

    // Outra conta Google assumiu a conexão: apagar por ela atingiria a agenda
    // errada. Espera a reconexão da identidade que criou o evento.
    if (vinculo.googleSub && conexao && conexao.googleSub !== vinculo.googleSub) {
      falhas.push({ userId: vinculo.userId, motivo: 'RECONEXAO', mensagem: 'identidade_google_diferente' });
      return;
    }

    try {
      await this.calendar.remover(vinculo.userId, vinculo.calendarId, vinculo.eventId);
      await this.prisma.plantaoEventoAgenda.delete({ where: { id: vinculo.id } });
    } catch (erro) {
      falhas.push(this.classificar(vinculo.userId, erro));
    }
  }

  private async publicar(
    plantao: PlantaoParaAgenda,
    destinatario: { id: string; email: string },
    vinculos: { id: string; userId: string; calendarId: string; eventId: string }[],
    falhas: FalhaSincronizacao[],
  ): Promise<void> {
    const conexao = await this.oauth.conexaoDoUsuario(destinatario.id);
    // Sem consentimento não há o que tentar: o perfil oferece a conexão.
    if (!conexao || conexao.status !== 'CONECTADA' || !conexao.refreshTokenCriptografado) return;

    const evento = montarEvento(plantao);
    const atual = vinculos.find((vinculo) => vinculo.userId === destinatario.id);

    try {
      if (atual) {
        const atualizado = await this.calendar.atualizar(destinatario.id, atual.calendarId, atual.eventId, evento);
        if (atualizado) {
          await this.prisma.plantaoEventoAgenda.update({
            where: { id: atual.id },
            data: { usuarioEmail: destinatario.email, googleSub: conexao.googleSub },
          });
          return;
        }
        // A pessoa apagou o evento na própria agenda: recria.
        await this.prisma.plantaoEventoAgenda.delete({ where: { id: atual.id } });
      }

      const calendarId = calendarioAlvo();
      const eventId = await this.calendar.criar(
        destinatario.id,
        calendarId,
        eventIdDeterministico(plantao.id, destinatario.id),
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
      await this.prisma.plantaoEventoAgenda.upsert({
        where: { plantaoId_userId: { plantaoId: plantao.id, userId: destinatario.id } },
        create: { plantaoId: plantao.id, userId: destinatario.id, ...dados },
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

  async statusDoUsuario(userId: string): Promise<StatusAgendaGoogle> {
    const [user, conexao, vinculos] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { agendaGoogleAtiva: true } }),
      this.oauth.conexaoDoUsuario(userId),
      this.prisma.plantaoEventoAgenda.count({ where: { userId } }),
    ]);

    const ativa = user?.agendaGoogleAtiva ?? false;
    const conectada = conexao?.status === 'CONECTADA' && !!conexao.refreshTokenCriptografado;
    const estado: EstadoConexaoAgenda = conectada
      ? 'CONECTADA'
      : conexao?.status === 'RECONECTAR'
        ? 'RECONECTAR'
        : 'NAO_CONECTADA';

    return {
      habilitado: this.habilitado,
      ativa,
      conexao: estado,
      googleEmail: estado === 'NAO_CONECTADA' ? null : (conexao?.googleEmail ?? null),
      // Desligar a sincronização enfileira a remoção; os eventos só somem
      // quando a fila alcançar cada plantão.
      limpezaPendente: !ativa && vinculos > 0,
    };
  }

  /**
   * Conexão pronta para escrever na agenda da pessoa, ou `null`. Outros módulos
   * (ex.: agendamento de salas) usam isto para decidir se vale chamar o Google.
   */
  async conexaoUtilizavel(userId: string): Promise<{ googleSub: string; googleEmail: string } | null> {
    const conexao = await this.oauth.conexaoDoUsuario(userId);
    if (!conexao || conexao.status !== 'CONECTADA' || !conexao.refreshTokenCriptografado) return null;
    return { googleSub: conexao.googleSub, googleEmail: conexao.googleEmail };
  }

  /** Identidade Google ligada hoje ao usuário, mesmo que precise reconectar. */
  async googleSubAtual(userId: string): Promise<string | null> {
    const conexao = await this.oauth.conexaoDoUsuario(userId);
    return conexao?.googleSub ?? null;
  }

  /** Sugere ao Google a conta certa. Não substitui a validação da identidade. */
  async emailDoUsuario(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user?.email ?? null;
  }

  async definirPreferencia(userId: string, ativa: boolean): Promise<StatusAgendaGoogle> {
    await this.prisma.user.update({ where: { id: userId }, data: { agendaGoogleAtiva: ativa } });
    await this.reprocessarDoUsuario(userId);
    return this.statusDoUsuario(userId);
  }

  /**
   * Interrompe o uso da conexão e apaga as credenciais locais. Os eventos já
   * criados permanecem no Google: para removê-los, desligue a sincronização e
   * aguarde a limpeza antes de desconectar.
   */
  async desconectar(userId: string): Promise<StatusAgendaGoogle> {
    await this.oauth.desconectar(userId);
    return this.statusDoUsuario(userId);
  }

  /**
   * Outros módulos que escrevem na agenda registram aqui como retomar o que
   * ficou parado quando a pessoa reconecta. Mantém a dependência num sentido
   * só: quem sincroniza conhece a agenda, a agenda não conhece quem sincroniza.
   */
  registrarReprocessador(reprocessar: (userId: string) => Promise<void>): void {
    this.reprocessadores.push(reprocessar);
  }

  /** Depois de conectar ou reconectar, retoma o que ficou parado. */
  async reprocessarDoUsuario(userId: string): Promise<void> {
    if (!this.habilitado) return;

    for (const reprocessar of this.reprocessadores) {
      try {
        await reprocessar(userId);
      } catch (erro) {
        this.logger.error(`Falha ao retomar pendências de outro módulo para ${userId}`, erro as Error);
      }
    }

    // Pendências paradas por falta de autorização voltam à fila, mesmo tendo
    // esgotado as tentativas antes da reconexão.
    await this.prisma.agendaSyncPendente.updateMany({
      where: { aguardandoReconexaoUserId: userId },
      data: { aguardandoReconexaoUserId: null, tentativas: 0, proximaTentativa: new Date(), ultimoErro: null },
    });

    const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const [futuros, comEvento] = await Promise.all([
      this.prisma.plantao.findMany({ where: { userId, data: { gte: hoje } }, select: { id: true } }),
      this.prisma.plantaoEventoAgenda.findMany({ where: { userId }, select: { plantaoId: true } }),
    ]);
    await this.enfileirar([...futuros.map((p) => p.id), ...comEvento.map((v) => v.plantaoId)]);
  }

  /** Quem recebe o evento: plantão publicado, pessoa ativa e sincronização ligada. */
  private destinatario(plantao: PlantaoParaAgenda | null) {
    if (!plantao || plantao.status !== 'PUBLICADO' || !plantao.user) return null;
    const user = plantao.user;
    if (!user.ativo || !user.agendaGoogleAtiva) return null;
    return user;
  }
}
