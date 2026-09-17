import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaGoogleCrypto } from './agenda-google.crypto';

const ESCOPO_EVENTOS = 'https://www.googleapis.com/auth/calendar.events';
/// Necessário só para consultar Free/Busy nos convites de agenda por e-mail
/// (seção 6 do plano). Não é exigido na validação de `concluir`: conexões
/// antigas sem esse escopo continuam válidas para criar/editar evento, e uma
/// consulta Free/Busy sem permissão vira DESCONHECIDO por item, sem bloquear.
const ESCOPO_FREEBUSY = 'https://www.googleapis.com/auth/calendar.events.freebusy';
const ESCOPOS = ['openid', 'email', ESCOPO_EVENTOS, ESCOPO_FREEBUSY];
const TENTATIVA_TTL_MS = 10 * 60 * 1000;

/** Motivos devolvidos ao frontend na URL de retorno. Nunca texto cru do Google. */
export type MotivoFalhaConexao =
  | 'recusado'
  | 'estado_invalido'
  | 'conta_diferente'
  | 'usuario_inativo'
  | 'permissao_incompleta'
  | 'sem_token'
  | 'falha';

export interface ResultadoConexao {
  ok: boolean;
  userId?: string;
  motivo?: MotivoFalhaConexao;
}

/** O acesso do usuário caiu: insistir não adianta, só uma nova conexão resolve. */
export class AgendaGoogleAutorizacaoPerdida extends Error {
  constructor(
    readonly userId: string,
    readonly motivo: string,
  ) {
    super(`Autorização da agenda indisponível para o usuário ${userId}: ${motivo}`);
    this.name = 'AgendaGoogleAutorizacaoPerdida';
  }
}

export interface ClienteAutorizado {
  cliente: OAuth2Client;
  googleSub: string;
  googleEmail: string;
}

interface ClienteCache {
  cliente: OAuth2Client;
  refreshToken: string;
  geracao: number;
}

function hash(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

/** Reaproveitado por outros módulos (ex.: convites de agenda por e-mail). */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** `invalid_grant` na renovação significa consentimento revogado ou expirado. */
function ehGrantInvalido(erro: unknown): boolean {
  const dados = (erro as { response?: { data?: { error?: string } } })?.response?.data;
  if (dados?.error === 'invalid_grant') return true;
  return (erro as Error)?.message?.includes('invalid_grant') === true;
}

/**
 * Autorização individual OAuth 2.0 da Agenda Google: consentimento, troca do
 * código, guarda do refresh token criptografado e entrega de clientes prontos
 * para a Calendar API. Não substitui o login do portal, que segue independente.
 */
@Injectable()
export class AgendaGoogleOAuthService {
  private readonly logger = new Logger(AgendaGoogleOAuthService.name);
  private readonly clientes = new Map<string, ClienteCache>();
  private readonly geracoes = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cripto: AgendaGoogleCrypto,
  ) {}

  get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  }

  private get clientSecret(): string {
    return process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET?.trim() ?? '';
  }

  get redirectUri(): string {
    return process.env.GOOGLE_CALENDAR_OAUTH_REDIRECT_URI?.trim() ?? '';
  }

  /** Sem cliente web completo e chave de criptografia não há conexão possível. */
  get configurado(): boolean {
    return !!this.clientId && !!this.clientSecret && !!this.redirectUri && this.cripto.configurada;
  }

  ensureConfigurado() {
    if (!this.configurado) throw new ServiceUnavailableException('Conexão com a Agenda Google indisponível');
  }

  private novoCliente(): OAuth2Client {
    return new OAuth2Client({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri,
    });
  }

  private geracao(userId: string): number {
    return this.geracoes.get(userId) ?? 0;
  }

  /** Invalida cliente em cache e descarta gravações de token ainda em voo. */
  private invalidarCache(userId: string) {
    this.geracoes.set(userId, this.geracao(userId) + 1);
    this.clientes.delete(userId);
  }

  // --- Início do consentimento -------------------------------------------

  /**
   * Registra a tentativa e monta a URL de consentimento. O `state` volta pela
   * URL do Google; o token do navegador viaja só no cookie da resposta.
   */
  async iniciar(userId: string, loginHint?: string) {
    this.ensureConfigurado();
    const state = randomBytes(32).toString('base64url');
    const browserToken = randomBytes(32).toString('base64url');

    await this.prisma.agendaGoogleOAuthTentativa.deleteMany({
      where: { OR: [{ expiraEm: { lt: new Date() } }, { userId }] },
    });
    await this.prisma.agendaGoogleOAuthTentativa.create({
      data: {
        stateHash: hash(state),
        browserHash: hash(browserToken),
        userId,
        expiraEm: new Date(Date.now() + TENTATIVA_TTL_MS),
      },
    });

    const url = this.novoCliente().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ESCOPOS,
      state,
      login_hint: loginHint,
    });

    return { url, browserToken, ttlMs: TENTATIVA_TTL_MS };
  }

  // --- Retorno do Google --------------------------------------------------

  /** Consome a tentativa: só a primeira exclusão encontra a linha. */
  private async consumirTentativa(state: string, browserToken: string): Promise<string | null> {
    const tentativa = await this.prisma.agendaGoogleOAuthTentativa.findUnique({
      where: { stateHash: hash(state) },
    });
    if (!tentativa) return null;
    if (tentativa.browserHash !== hash(browserToken)) return null;
    if (tentativa.expiraEm.getTime() <= Date.now()) return null;

    const { count } = await this.prisma.agendaGoogleOAuthTentativa.deleteMany({ where: { id: tentativa.id } });
    return count === 1 ? tentativa.userId : null;
  }

  /**
   * Valida o retorno, troca o código e grava a conexão. Devolve um motivo
   * conhecido em vez de propagar mensagens do provedor.
   */
  async concluir(params: {
    state?: string;
    code?: string;
    error?: string;
    browserToken?: string;
  }): Promise<ResultadoConexao> {
    if (!this.configurado) return { ok: false, motivo: 'falha' };
    if (!params.state || !params.browserToken) return { ok: false, motivo: 'estado_invalido' };

    const userId = await this.consumirTentativa(params.state, params.browserToken);
    if (!userId) return { ok: false, motivo: 'estado_invalido' };
    if (params.error || !params.code) return { ok: false, userId, motivo: 'recusado' };

    try {
      return await this.registrarConexao(userId, params.code);
    } catch (erro) {
      this.logger.error(`Falha ao concluir a conexão da agenda do usuário ${userId}`, erro as Error);
      return { ok: false, userId, motivo: 'falha' };
    }
  }

  private async registrarConexao(userId: string, code: string): Promise<ResultadoConexao> {
    const cliente = this.novoCliente();
    const { tokens } = await cliente.getToken(code);
    if (!tokens.id_token) return { ok: false, userId, motivo: 'falha' };

    const ticket = await cliente.verifyIdToken({ idToken: tokens.id_token, audience: this.clientId });
    const perfil = ticket.getPayload();
    if (!perfil?.sub || !perfil.email || !perfil.email_verified) {
      return { ok: false, userId, motivo: 'conta_diferente' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, ativo: true, googleSub: true },
    });
    if (!user || !user.ativo) return { ok: false, userId, motivo: 'usuario_inativo' };

    // A conta autorizada precisa ser a mesma do portal: o consentimento vale
    // para a agenda de quem entrou no Google, não de quem abriu o portal.
    if (normalizarEmail(user.email) !== normalizarEmail(perfil.email)) {
      return { ok: false, userId, motivo: 'conta_diferente' };
    }
    if (user.googleSub && user.googleSub !== perfil.sub) return { ok: false, userId, motivo: 'conta_diferente' };

    const escopos = tokens.scope ?? '';
    if (!escopos.split(/\s+/).includes(ESCOPO_EVENTOS)) {
      return { ok: false, userId, motivo: 'permissao_incompleta' };
    }

    const anterior = await this.prisma.agendaGoogleConexao.findUnique({ where: { userId } });
    // Sem refresh token novo, só serve o anterior da mesma identidade; nunca
    // gravar vazio por cima de um token que ainda funciona.
    const mesmaIdentidade = !!anterior && anterior.googleSub === perfil.sub;
    const refreshTokenCriptografado = tokens.refresh_token
      ? this.cripto.criptografar(tokens.refresh_token)
      : mesmaIdentidade
        ? anterior.refreshTokenCriptografado
        : null;
    if (!refreshTokenCriptografado) return { ok: false, userId, motivo: 'sem_token' };

    const dados = {
      googleSub: perfil.sub,
      googleEmail: perfil.email,
      refreshTokenCriptografado,
      escopos,
      status: 'CONECTADA' as const,
      ultimoErro: null,
    };
    await this.prisma.agendaGoogleConexao.upsert({
      where: { userId },
      create: { userId, ...dados },
      update: dados,
    });

    this.invalidarCache(userId);
    return { ok: true, userId };
  }

  // --- Uso da conexão -----------------------------------------------------

  async conexaoDoUsuario(userId: string) {
    return this.prisma.agendaGoogleConexao.findUnique({
      where: { userId },
      select: { googleSub: true, googleEmail: true, status: true, refreshTokenCriptografado: true },
    });
  }

  /** Marca a conexão para reconexão e derruba o cliente em cache. */
  async marcarReconexao(userId: string, motivo: string): Promise<void> {
    this.invalidarCache(userId);
    await this.prisma.agendaGoogleConexao
      .updateMany({ where: { userId }, data: { status: 'RECONECTAR', ultimoErro: motivo.slice(0, 300) } })
      .catch((erro) => this.logger.error(`Não foi possível marcar reconexão do usuário ${userId}`, erro as Error));
  }

  /** Remove as credenciais locais. Eventos já criados permanecem no Google. */
  async desconectar(userId: string): Promise<void> {
    this.invalidarCache(userId);
    await this.prisma.agendaGoogleConexao.updateMany({
      where: { userId },
      data: { status: 'DESCONECTADA', refreshTokenCriptografado: null, ultimoErro: null },
    });
  }

  /**
   * Cliente pronto para chamar a Calendar API pelo usuário. Devolve null quando
   * não há conexão utilizável e lança quando a autorização foi perdida.
   */
  async clienteAutorizado(userId: string): Promise<ClienteAutorizado | null> {
    if (!this.configurado) return null;

    const conexao = await this.conexaoDoUsuario(userId);
    if (!conexao || conexao.status !== 'CONECTADA' || !conexao.refreshTokenCriptografado) return null;

    const refreshToken = this.cripto.descriptografar(conexao.refreshTokenCriptografado);
    if (!refreshToken) {
      await this.marcarReconexao(userId, 'token_ilegivel');
      throw new AgendaGoogleAutorizacaoPerdida(userId, 'token_ilegivel');
    }

    const cliente = this.clienteDoCache(userId, refreshToken);
    try {
      await cliente.getAccessToken();
    } catch (erro) {
      if (ehGrantInvalido(erro)) {
        await this.marcarReconexao(userId, 'invalid_grant');
        throw new AgendaGoogleAutorizacaoPerdida(userId, 'invalid_grant');
      }
      throw erro;
    }

    return { cliente, googleSub: conexao.googleSub, googleEmail: conexao.googleEmail };
  }

  private clienteDoCache(userId: string, refreshToken: string): OAuth2Client {
    const existente = this.clientes.get(userId);
    if (existente && existente.refreshToken === refreshToken && existente.geracao === this.geracao(userId)) {
      return existente.cliente;
    }

    const cliente = this.novoCliente();
    cliente.setCredentials({ refresh_token: refreshToken });

    const geracao = this.geracao(userId);
    cliente.on('tokens', (tokens) => {
      if (!tokens.refresh_token) return;
      void this.guardarRefreshToken(userId, geracao, tokens.refresh_token);
    });

    this.clientes.set(userId, { cliente, refreshToken, geracao });
    return cliente;
  }

  /** Descarta a gravação se a conexão mudou enquanto a renovação acontecia. */
  private async guardarRefreshToken(userId: string, geracao: number, refreshToken: string): Promise<void> {
    if (geracao !== this.geracao(userId)) return;
    try {
      await this.prisma.agendaGoogleConexao.updateMany({
        where: { userId, status: 'CONECTADA' },
        data: { refreshTokenCriptografado: this.cripto.criptografar(refreshToken) },
      });
      const cache = this.clientes.get(userId);
      if (cache && cache.geracao === geracao) cache.refreshToken = refreshToken;
    } catch (erro) {
      this.logger.error(`Não foi possível guardar o refresh token do usuário ${userId}`, erro as Error);
    }
  }
}
