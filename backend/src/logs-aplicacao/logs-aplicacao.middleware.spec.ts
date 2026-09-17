import { Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { LogsAplicacaoMiddleware } from './logs-aplicacao.middleware';
import type { RequestComLogAplicacao } from './logs-aplicacao.types';

function criarReq(overrides: Record<string, unknown> = {}): RequestComLogAplicacao {
  return {
    method: 'GET',
    path: '/plantoes',
    ip: '127.0.0.1',
    route: { path: '/plantoes/:id' },
    baseUrl: '',
    get: () => 'jest-agent/1.0',
    user: undefined,
    ...overrides,
  } as unknown as RequestComLogAplicacao;
}

function criarRes() {
  const res = new EventEmitter() as EventEmitter & { setHeader: jest.Mock; statusCode: number; writableEnded: boolean };
  res.setHeader = jest.fn();
  res.statusCode = 200;
  res.writableEnded = true;
  return res;
}

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('LogsAplicacaoMiddleware', () => {
  const serviceMock = { registrar: jest.fn().mockResolvedValue(undefined) };
  let middleware: LogsAplicacaoMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceMock.registrar.mockResolvedValue(undefined);
    middleware = new LogsAplicacaoMiddleware(serviceMock as never);
    next = jest.fn();
  });

  it('ignora requisições OPTIONS', () => {
    const req = criarReq({ method: 'OPTIONS' });
    const res = criarRes();

    middleware.use(req, res as never, next as never);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    res.emit('finish');
    expect(serviceMock.registrar).not.toHaveBeenCalled();
  });

  it.each(['/logs-aplicacao', '/logs-aplicacao/abc123'])('ignora a consulta do próprio módulo (GET %s)', (path) => {
    const req = criarReq({ method: 'GET', path });
    const res = criarRes();

    middleware.use(req, res as never, next as never);
    res.emit('finish');

    expect(serviceMock.registrar).not.toHaveBeenCalled();
  });

  it('gera um requestId e devolve no header X-Request-Id', () => {
    const req = criarReq();
    const res = criarRes();

    middleware.use(req, res as never, next as never);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(req.logAplicacaoContexto?.requestId).toBe((res.setHeader as jest.Mock).mock.calls[0][1]);
  });

  it('registra o resumo quando a resposta termina, com status e template da rota', async () => {
    const req = criarReq({ route: { path: '/plantoes/:id' } });
    const res = criarRes();
    res.statusCode = 204;

    middleware.use(req, res as never, next as never);
    res.emit('finish');
    await tick();

    expect(serviceMock.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ rota: '/plantoes/:id', statusHttp: 204, abortada: false, metodo: 'GET' }),
    );
  });

  it('usa "rota não reconhecida" quando não há template casado (404 sem rota)', async () => {
    const req = criarReq({ route: undefined });
    const res = criarRes();
    res.statusCode = 404;

    middleware.use(req, res as never, next as never);
    res.emit('finish');
    await tick();

    expect(serviceMock.registrar).toHaveBeenCalledWith(expect.objectContaining({ rota: 'rota não reconhecida' }));
  });

  it('marca abortada e status 499 quando a conexão fecha antes do finish', async () => {
    const req = criarReq();
    const res = criarRes();
    res.writableEnded = false;

    middleware.use(req, res as never, next as never);
    res.emit('close');
    await tick();

    expect(serviceMock.registrar).toHaveBeenCalledWith(expect.objectContaining({ abortada: true, statusHttp: 499 }));
  });

  it('não registra duas vezes quando finish e close disparam para a mesma resposta', async () => {
    const req = criarReq();
    const res = criarRes();
    res.writableEnded = true;

    middleware.use(req, res as never, next as never);
    res.emit('finish');
    res.emit('close');
    await tick();

    expect(serviceMock.registrar).toHaveBeenCalledTimes(1);
  });

  it('associa o usuário autenticado quando presente, sem inventar um ator quando ausente', async () => {
    const req = criarReq({ user: { id: 'user1', role: 'ADMIN' } });
    const res = criarRes();

    middleware.use(req, res as never, next as never);
    res.emit('finish');
    await tick();

    expect(serviceMock.registrar).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 'user1' }));
  });

  it('não deixa a falha do registro propagar — só loga com o requestId', async () => {
    const erroSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    serviceMock.registrar.mockRejectedValueOnce(new Error('conexão com o banco indisponível'));
    const req = criarReq();
    const res = criarRes();

    middleware.use(req, res as never, next as never);
    res.emit('finish');
    await tick();
    await tick();

    expect(erroSpy).toHaveBeenCalledWith(
      expect.stringContaining(req.logAplicacaoContexto!.requestId),
      expect.any(String),
    );
    erroSpy.mockRestore();
  });
});
