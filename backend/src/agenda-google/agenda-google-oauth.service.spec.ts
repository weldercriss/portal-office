import { randomBytes } from 'crypto';
import { AgendaGoogleAutorizacaoPerdida, AgendaGoogleOAuthService } from './agenda-google-oauth.service';
import { AgendaGoogleCrypto } from './agenda-google.crypto';

interface OpcoesConsentimento {
  access_type?: string;
  prompt?: string;
  scope?: string[];
  state?: string;
  login_hint?: string;
}

const clienteFalso = {
  generateAuthUrl: jest.fn((_opcoes: OpcoesConsentimento) => 'https://accounts.google.com/o/oauth2/v2/auth?fake'),
  getToken: jest.fn(),
  verifyIdToken: jest.fn(),
  setCredentials: jest.fn((_credenciais: { refresh_token: string }) => undefined),
  getAccessToken: jest.fn(),
  on: jest.fn(),
};

/** Opções da última URL de consentimento montada pelo serviço. */
function consentimento(): OpcoesConsentimento {
  return clienteFalso.generateAuthUrl.mock.calls[0]![0];
}

function stateEmitido(): string {
  return consentimento().state!;
}

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => clienteFalso),
}));

const ESCOPOS_OK = 'openid email https://www.googleapis.com/auth/calendar.events';
const USER = { id: 'u1', email: 'ana@empresa.com', ativo: true, googleSub: 'sub-ana' };

function perfil(sobrescrever: Record<string, unknown> = {}) {
  return { sub: 'sub-ana', email: 'ana@empresa.com', email_verified: true, ...sobrescrever };
}

describe('AgendaGoogleOAuthService', () => {
  const prismaMock = {
    agendaGoogleOAuthTentativa: { create: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn() },
    agendaGoogleConexao: { findUnique: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  let cripto: AgendaGoogleCrypto;
  let service: AgendaGoogleOAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET = 'segredo';
    process.env.GOOGLE_CALENDAR_OAUTH_REDIRECT_URI = 'http://localhost:3333/agenda-google/oauth/callback';
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');

    cripto = new AgendaGoogleCrypto();
    service = new AgendaGoogleOAuthService(prismaMock as never, cripto);

    prismaMock.agendaGoogleOAuthTentativa.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue(null);
    prismaMock.agendaGoogleConexao.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findUnique.mockResolvedValue({ ...USER });
    clienteFalso.getToken.mockResolvedValue({
      tokens: { id_token: 'id-token', refresh_token: '1//refresh', scope: ESCOPOS_OK },
    });
    clienteFalso.verifyIdToken.mockResolvedValue({ getPayload: () => perfil() });
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_CALENDAR_OAUTH_REDIRECT_URI;
    delete process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  });

  /** Reproduz o retorno do Google reaproveitando o state emitido pelo início. */
  async function conectar(sobrescrever: { code?: string; error?: string } = {}) {
    const { browserToken } = await service.iniciar('u1');
    const { data } = prismaMock.agendaGoogleOAuthTentativa.create.mock.calls[0]![0];
    const state = stateEmitido();
    prismaMock.agendaGoogleOAuthTentativa.findUnique.mockResolvedValue({
      id: 't1',
      stateHash: data.stateHash,
      browserHash: data.browserHash,
      userId: 'u1',
      expiraEm: data.expiraEm,
    });
    return service.concluir({ state, code: 'codigo-do-google', browserToken, ...sobrescrever });
  }

  it('só está configurado com cliente web completo e chave de criptografia', () => {
    expect(service.configurado).toBe(true);
    delete process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET;
    expect(service.configurado).toBe(false);
  });

  it('pede acesso offline e consentimento explícito nos escopos da agenda', async () => {
    await service.iniciar('u1', 'ana@empresa.com');

    const opcoes = consentimento();
    expect(opcoes).toMatchObject({ access_type: 'offline', prompt: 'consent', login_hint: 'ana@empresa.com' });
    expect(opcoes.scope).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(opcoes.state).toEqual(expect.any(String));
  });

  it('guarda apenas os hashes do state e do navegador', async () => {
    const { browserToken } = await service.iniciar('u1');
    const { data } = prismaMock.agendaGoogleOAuthTentativa.create.mock.calls[0]![0];
    const state = stateEmitido();

    expect(data.stateHash).not.toBe(state);
    expect(data.browserHash).not.toBe(browserToken);
    expect(data.expiraEm.getTime()).toBeGreaterThan(Date.now());
  });

  it('recusa callback sem state ou sem cookie do navegador', async () => {
    expect(await service.concluir({ code: 'x', browserToken: 'b' })).toMatchObject({ motivo: 'estado_invalido' });
    expect(await service.concluir({ state: 's', code: 'x' })).toMatchObject({ motivo: 'estado_invalido' });
  });

  it('recusa state desconhecido', async () => {
    prismaMock.agendaGoogleOAuthTentativa.findUnique.mockResolvedValue(null);
    expect(await service.concluir({ state: 's', code: 'x', browserToken: 'b' })).toMatchObject({
      motivo: 'estado_invalido',
    });
  });

  it('recusa retorno vindo de outro navegador', async () => {
    const { browserToken } = await service.iniciar('u1');
    const { data } = prismaMock.agendaGoogleOAuthTentativa.create.mock.calls[0]![0];
    const state = stateEmitido();
    prismaMock.agendaGoogleOAuthTentativa.findUnique.mockResolvedValue({
      id: 't1',
      stateHash: data.stateHash,
      browserHash: 'hash-de-outro-navegador',
      userId: 'u1',
      expiraEm: data.expiraEm,
    });

    expect(await service.concluir({ state, code: 'x', browserToken })).toMatchObject({ motivo: 'estado_invalido' });
    expect(clienteFalso.getToken).not.toHaveBeenCalled();
  });

  it('recusa tentativa expirada', async () => {
    const { browserToken } = await service.iniciar('u1');
    const { data } = prismaMock.agendaGoogleOAuthTentativa.create.mock.calls[0]![0];
    const state = stateEmitido();
    prismaMock.agendaGoogleOAuthTentativa.findUnique.mockResolvedValue({
      id: 't1',
      stateHash: data.stateHash,
      browserHash: data.browserHash,
      userId: 'u1',
      expiraEm: new Date(Date.now() - 1000),
    });

    expect(await service.concluir({ state, code: 'x', browserToken })).toMatchObject({ motivo: 'estado_invalido' });
  });

  it('recusa state reutilizado: só a primeira exclusão vence', async () => {
    prismaMock.agendaGoogleOAuthTentativa.deleteMany.mockResolvedValue({ count: 0 });
    expect(await conectar()).toMatchObject({ motivo: 'estado_invalido' });
    expect(clienteFalso.getToken).not.toHaveBeenCalled();
  });

  it('trata a recusa do consentimento sem chamar a troca de código', async () => {
    expect(await conectar({ error: 'access_denied', code: undefined })).toMatchObject({ motivo: 'recusado' });
    expect(clienteFalso.getToken).not.toHaveBeenCalled();
  });

  it('recusa conta Google diferente da conta do portal', async () => {
    clienteFalso.verifyIdToken.mockResolvedValue({ getPayload: () => perfil({ email: 'outra@empresa.com' }) });
    expect(await conectar()).toMatchObject({ motivo: 'conta_diferente' });
    expect(prismaMock.agendaGoogleConexao.upsert).not.toHaveBeenCalled();
  });

  it('recusa sub diferente do vínculo de login já existente', async () => {
    clienteFalso.verifyIdToken.mockResolvedValue({ getPayload: () => perfil({ sub: 'sub-outro' }) });
    expect(await conectar()).toMatchObject({ motivo: 'conta_diferente' });
  });

  it('recusa e-mail não verificado', async () => {
    clienteFalso.verifyIdToken.mockResolvedValue({ getPayload: () => perfil({ email_verified: false }) });
    expect(await conectar()).toMatchObject({ motivo: 'conta_diferente' });
  });

  it('recusa usuário desativado no portal', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, ativo: false });
    expect(await conectar()).toMatchObject({ motivo: 'usuario_inativo' });
  });

  it('recusa consentimento parcial sem a permissão de eventos', async () => {
    clienteFalso.getToken.mockResolvedValue({
      tokens: { id_token: 'id-token', refresh_token: '1//refresh', scope: 'openid email' },
    });
    expect(await conectar()).toMatchObject({ motivo: 'permissao_incompleta' });
    expect(prismaMock.agendaGoogleConexao.upsert).not.toHaveBeenCalled();
  });

  it('guarda o refresh token criptografado e nunca em texto puro', async () => {
    expect(await conectar()).toMatchObject({ ok: true, userId: 'u1' });

    const { create, update } = prismaMock.agendaGoogleConexao.upsert.mock.calls[0]![0];
    expect(create).toMatchObject({ userId: 'u1', googleSub: 'sub-ana', status: 'CONECTADA', escopos: ESCOPOS_OK });
    expect(create.refreshTokenCriptografado).not.toContain('1//refresh');
    expect(cripto.descriptografar(create.refreshTokenCriptografado)).toBe('1//refresh');
    expect(update.ultimoErro).toBeNull();
  });

  it('preserva o token anterior quando o Google não devolve outro', async () => {
    const anterior = cripto.criptografar('1//antigo');
    prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue({
      googleSub: 'sub-ana',
      refreshTokenCriptografado: anterior,
    });
    clienteFalso.getToken.mockResolvedValue({ tokens: { id_token: 'id-token', scope: ESCOPOS_OK } });

    expect(await conectar()).toMatchObject({ ok: true });
    const { create } = prismaMock.agendaGoogleConexao.upsert.mock.calls[0]![0];
    expect(create.refreshTokenCriptografado).toBe(anterior);
  });

  it('exige nova conexão quando não há token novo nem anterior utilizável', async () => {
    clienteFalso.getToken.mockResolvedValue({ tokens: { id_token: 'id-token', scope: ESCOPOS_OK } });
    expect(await conectar()).toMatchObject({ motivo: 'sem_token' });
    expect(prismaMock.agendaGoogleConexao.upsert).not.toHaveBeenCalled();
  });

  it('não aproveita token de outra identidade Google', async () => {
    prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue({
      googleSub: 'sub-antigo',
      refreshTokenCriptografado: cripto.criptografar('1//de-outra-conta'),
    });
    clienteFalso.getToken.mockResolvedValue({ tokens: { id_token: 'id-token', scope: ESCOPOS_OK } });

    expect(await conectar()).toMatchObject({ motivo: 'sem_token' });
  });

  it('não devolve mensagem crua do provedor quando a troca falha', async () => {
    clienteFalso.getToken.mockRejectedValue(new Error('invalid_client: segredo errado'));
    expect(await conectar()).toEqual({ ok: false, userId: 'u1', motivo: 'falha' });
  });

  describe('clienteAutorizado', () => {
    const conexao = {
      googleSub: 'sub-ana',
      googleEmail: 'ana@empresa.com',
      status: 'CONECTADA',
      refreshTokenCriptografado: '',
    };

    beforeEach(() => {
      conexao.refreshTokenCriptografado = cripto.criptografar('1//refresh');
      prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue({ ...conexao });
      clienteFalso.getAccessToken.mockResolvedValue({ token: 'access' });
    });

    it('devolve null sem conexão utilizável', async () => {
      prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue(null);
      expect(await service.clienteAutorizado('u1')).toBeNull();

      prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue({ ...conexao, status: 'DESCONECTADA' });
      expect(await service.clienteAutorizado('u1')).toBeNull();
    });

    it('entrega o cliente com o refresh token recuperado', async () => {
      const autorizado = await service.clienteAutorizado('u1');
      expect(autorizado).toMatchObject({ googleSub: 'sub-ana', googleEmail: 'ana@empresa.com' });
      expect(clienteFalso.setCredentials).toHaveBeenCalledWith({ refresh_token: '1//refresh' });
    });

    it('reaproveita o cliente em cache do mesmo usuário', async () => {
      await service.clienteAutorizado('u1');
      await service.clienteAutorizado('u1');
      expect(clienteFalso.setCredentials).toHaveBeenCalledTimes(1);
    });

    it('marca reconexão e para de insistir quando o consentimento foi revogado', async () => {
      clienteFalso.getAccessToken.mockRejectedValue({ response: { data: { error: 'invalid_grant' } } });

      await expect(service.clienteAutorizado('u1')).rejects.toBeInstanceOf(AgendaGoogleAutorizacaoPerdida);
      expect(prismaMock.agendaGoogleConexao.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'RECONECTAR' }) }),
      );
    });

    it('propaga falha transitória sem marcar reconexão', async () => {
      clienteFalso.getAccessToken.mockRejectedValue(new Error('socket hang up'));

      await expect(service.clienteAutorizado('u1')).rejects.toThrow('socket hang up');
      expect(prismaMock.agendaGoogleConexao.updateMany).not.toHaveBeenCalled();
    });

    it('exige reconexão quando o token guardado não abre com a chave atual', async () => {
      prismaMock.agendaGoogleConexao.findUnique.mockResolvedValue({
        ...conexao,
        refreshTokenCriptografado: 'v1.aaa.bbb.ccc',
      });

      await expect(service.clienteAutorizado('u1')).rejects.toBeInstanceOf(AgendaGoogleAutorizacaoPerdida);
    });

    it('desconectar apaga o token local e derruba o cliente em cache', async () => {
      await service.clienteAutorizado('u1');
      await service.desconectar('u1');

      expect(prismaMock.agendaGoogleConexao.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { status: 'DESCONECTADA', refreshTokenCriptografado: null, ultimoErro: null },
      });

      await service.clienteAutorizado('u1');
      // Cliente reconstruído: o cache anterior não sobrevive à desconexão.
      expect(clienteFalso.setCredentials).toHaveBeenCalledTimes(2);
    });
  });
});
