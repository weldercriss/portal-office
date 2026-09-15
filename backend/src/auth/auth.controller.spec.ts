import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

describe('AuthController cookies', () => {
  const originalPath = process.env.COOKIE_PATH;
  const originalSecure = process.env.COOKIE_SECURE;
  const service = { login: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user: {} }) };
  const controller = new AuthController(service as unknown as AuthService);
  const response = { cookie: jest.fn(), clearCookie: jest.fn() };

  afterEach(() => {
    if (originalPath === undefined) delete process.env.COOKIE_PATH;
    else process.env.COOKIE_PATH = originalPath;
    if (originalSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = originalSecure;
    jest.clearAllMocks();
  });

  it.each([
    [undefined, undefined, '/auth/refresh', false],
    ['/api/auth/refresh', 'true', '/api/auth/refresh', true],
    ['/api/auth/refresh', 'false', '/api/auth/refresh', false],
  ])('supports local, HTTPS and HTTP proxy modes (%s, %s)', async (path, secure, expectedPath, expectedSecure) => {
    if (path === undefined) delete process.env.COOKIE_PATH;
    else process.env.COOKIE_PATH = path;
    if (secure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = secure;
    await controller.login({ email: 'admin@example.com', senha: 'password' }, response as unknown as Response);
    const options = { path: expectedPath, secure: expectedSecure, httpOnly: true, sameSite: 'lax' };
    expect(response.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.objectContaining(options));
    controller.logout(response as unknown as Response);
    expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', options);
  });
});

describe('AuthController Google', () => {
  const originalPath = process.env.COOKIE_PATH;
  const service = {
    googleHabilitado: true,
    userIdFromAuthorization: jest.fn().mockResolvedValue('user-1'),
    createGoogleChallenge: jest
      .fn()
      .mockResolvedValue({ nonce: 'nonce-1', browserToken: 'browser-1', expiraEm: new Date(0), ttlMs: 600000 }),
    loginWithGoogle: jest
      .fn()
      .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user: { id: 'user-1' } }),
    linkGoogle: jest.fn().mockResolvedValue({ email: 'ana@empresa.com', googleLinkedAt: new Date(0) }),
  };
  const controller = new AuthController(service as unknown as AuthService);
  const response = { cookie: jest.fn(), clearCookie: jest.fn() };

  function request(extra: Partial<Request> = {}) {
    return { headers: {}, cookies: { google_challenge: 'browser-1' }, ...extra } as unknown as Request;
  }

  afterEach(() => {
    if (originalPath === undefined) delete process.env.COOKIE_PATH;
    else process.env.COOKIE_PATH = originalPath;
    jest.clearAllMocks();
  });

  it('informa se a integração está habilitada', () => {
    expect(controller.googleStatus()).toEqual({ habilitado: true });
  });

  it('emite o desafio de login com cookie válido para as rotas de /auth', async () => {
    delete process.env.COOKIE_PATH;
    const retorno = await controller.googleChallenge(
      { finalidade: 'LOGIN' },
      request(),
      response as unknown as Response,
    );

    expect(service.createGoogleChallenge).toHaveBeenCalledWith('LOGIN', undefined);
    expect(retorno).toMatchObject({ nonce: 'nonce-1' });
    expect(response.cookie).toHaveBeenCalledWith(
      'google_challenge',
      'browser-1',
      expect.objectContaining({ path: '/auth', httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('vincula o desafio de vínculo ao usuário autenticado', async () => {
    process.env.COOKIE_PATH = '/api/auth/refresh';
    await controller.googleChallenge(
      { finalidade: 'VINCULO' },
      request({ headers: { authorization: 'Bearer token' } }),
      response as unknown as Response,
    );

    expect(service.userIdFromAuthorization).toHaveBeenCalledWith('Bearer token');
    expect(service.createGoogleChallenge).toHaveBeenCalledWith('VINCULO', 'user-1');
    expect(response.cookie).toHaveBeenCalledWith(
      'google_challenge',
      'browser-1',
      expect.objectContaining({ path: '/api/auth' }),
    );
  });

  it('troca a credencial Google pela sessão do portal e descarta o desafio', async () => {
    const retorno = await controller.googleLogin(
      { credential: 'credencial' },
      request(),
      response as unknown as Response,
    );

    expect(service.loginWithGoogle).toHaveBeenCalledWith('credencial', 'browser-1');
    expect(retorno).toEqual({ accessToken: 'access', user: { id: 'user-1' } });
    expect(response.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.objectContaining({ httpOnly: true }));
    expect(response.clearCookie).toHaveBeenCalledWith('google_challenge', expect.objectContaining({ path: '/auth' }));
  });

  it('vincula a conta usando o usuário da sessão', async () => {
    await controller.googleLink(
      { credential: 'credencial', senha: 'senha123' },
      request({ user: { id: 'user-1', role: 'USER' } } as Partial<Request>),
      response as unknown as Response,
    );

    expect(service.linkGoogle).toHaveBeenCalledWith('user-1', 'credencial', 'senha123', 'browser-1');
    expect(response.clearCookie).toHaveBeenCalledWith('google_challenge', expect.objectContaining({ path: '/auth' }));
  });
});
