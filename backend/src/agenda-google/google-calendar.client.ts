import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AgendaGoogleAutorizacaoPerdida, AgendaGoogleOAuthService } from './agenda-google-oauth.service';

const API = 'https://www.googleapis.com/calendar/v3';

export interface DataHoraEvento {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface EventoAgenda {
  summary: string;
  description?: string;
  location?: string;
  start: DataHoraEvento;
  end: DataHoraEvento;
  status?: string;
  extendedProperties?: { private?: Record<string, string> };
}

export interface EventoExistente {
  id: string;
  summary: string;
  start: DataHoraEvento;
  end: DataHoraEvento;
}

function status(erro: unknown): number | undefined {
  return (erro as { response?: { status?: number } })?.response?.status;
}

function motivoGoogle(erro: unknown): string {
  const dados = (erro as { response?: { data?: { error?: { errors?: { reason?: string }[] } } } })?.response?.data;
  return dados?.error?.errors?.[0]?.reason ?? '';
}

/**
 * `403` cobre desde permissão perdida até estouro de cota. Só os motivos de
 * autorização exigem reconexão; os demais continuam valendo nova tentativa.
 */
const RAZOES_SEM_AUTORIZACAO = ['insufficientPermissions', 'forbiddenForServiceAccounts', 'authError'];

/**
 * IDs de evento da Calendar API aceitam apenas `0-9a-v` (base32hex). O ID
 * derivado da origem e do usuário torna a criação idempotente: uma repetição
 * depois de falha ao guardar o vínculo reencontra o mesmo evento em vez de
 * criar outro. Cada módulo prefixa a própria origem (`reserva:<id>`) para que
 * dois registros diferentes nunca cheguem ao mesmo evento.
 */
export function eventIdDeterministico(origemId: string, userId: string): string {
  const digest = createHash('sha256').update(`${origemId}:${userId}`).digest('hex');
  return `ops${BigInt(`0x${digest}`).toString(32)}`;
}

/**
 * Acesso à Calendar API com a autorização individual de cada pessoa: o portal
 * usa o refresh token que ela concedeu em Meu perfil, sem delegação de domínio.
 */
@Injectable()
export class GoogleCalendarClient {
  constructor(private readonly oauth: AgendaGoogleOAuthService) {}

  /** Depende só da chave de integração e da configuração OAuth do backend. */
  get habilitado(): boolean {
    return process.env.GOOGLE_CALENDAR_ENABLED === 'true' && this.oauth.configurado;
  }

  private async cliente(userId: string) {
    const autorizado = await this.oauth.clienteAutorizado(userId);
    if (!autorizado) throw new AgendaGoogleAutorizacaoPerdida(userId, 'sem_conexao');
    return autorizado.cliente;
  }

  private url(calendarId: string, eventId?: string): string {
    const base = `${API}/calendars/${encodeURIComponent(calendarId)}/events`;
    return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
  }

  /** 404 e 410 significam que a pessoa já apagou o evento na própria agenda. */
  private sumiu(erro: unknown): boolean {
    const codigo = status(erro);
    return codigo === 404 || codigo === 410;
  }

  /** Traduz a falha do Google: reconexão necessária ou erro que vale repetir. */
  private async classificar(userId: string, erro: unknown): Promise<never> {
    const codigo = status(erro);
    if (codigo === 401) {
      await this.oauth.marcarReconexao(userId, 'http_401');
      throw new AgendaGoogleAutorizacaoPerdida(userId, 'http_401');
    }
    if (codigo === 403 && RAZOES_SEM_AUTORIZACAO.includes(motivoGoogle(erro))) {
      const motivo = motivoGoogle(erro);
      await this.oauth.marcarReconexao(userId, motivo);
      throw new AgendaGoogleAutorizacaoPerdida(userId, motivo);
    }
    throw erro;
  }

  /**
   * Cria com ID próprio; se o ID já existir (409), atualiza o evento existente,
   * inclusive quando ele estava cancelado na agenda da pessoa.
   */
  async criar(userId: string, calendarId: string, eventId: string, evento: EventoAgenda): Promise<string> {
    const cliente = await this.cliente(userId);
    try {
      const resposta = await cliente.request<{ id: string }>({
        url: this.url(calendarId),
        method: 'POST',
        data: { ...evento, id: eventId },
      });
      return resposta.data.id;
    } catch (erro) {
      if (status(erro) !== 409) return this.classificar(userId, erro);
      await cliente.request({
        url: this.url(calendarId, eventId),
        method: 'PATCH',
        data: { ...evento, status: 'confirmed' },
      });
      return eventId;
    }
  }

  /** Retorna false quando o evento não existe mais e precisa ser recriado. */
  async atualizar(userId: string, calendarId: string, eventId: string, evento: EventoAgenda): Promise<boolean> {
    const cliente = await this.cliente(userId);
    try {
      await cliente.request({ url: this.url(calendarId, eventId), method: 'PATCH', data: evento });
      return true;
    } catch (erro) {
      if (this.sumiu(erro)) return false;
      return this.classificar(userId, erro);
    }
  }

  async remover(userId: string, calendarId: string, eventId: string): Promise<void> {
    const cliente = await this.cliente(userId);
    try {
      await cliente.request({ url: this.url(calendarId, eventId), method: 'DELETE' });
    } catch (erro) {
      if (this.sumiu(erro)) return;
      await this.classificar(userId, erro);
    }
  }

  /**
   * Eventos existentes que colidem com o intervalo informado, para mostrar a
   * divergência antes de agendar em cima de um compromisso já marcado.
   */
  async listarNoIntervalo(
    userId: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<EventoExistente[]> {
    const cliente = await this.cliente(userId);
    try {
      const resposta = await cliente.request<{
        items: { id: string; summary?: string; status?: string; start: DataHoraEvento; end: DataHoraEvento }[];
      }>({
        url: this.url(calendarId),
        method: 'GET',
        params: { timeMin, timeMax, singleEvents: true, orderBy: 'startTime' },
      });
      return (resposta.data.items ?? [])
        .filter((evento) => evento.status !== 'cancelled')
        .map((evento) => ({ id: evento.id, summary: evento.summary ?? '(sem título)', start: evento.start, end: evento.end }));
    } catch (erro) {
      return this.classificar(userId, erro);
    }
  }
}
