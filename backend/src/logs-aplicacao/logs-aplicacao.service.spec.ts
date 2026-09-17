import { NotFoundException } from '@nestjs/common';
import { LogAplicacaoResultado } from '@prisma/client';
import { LogsAplicacaoService } from './logs-aplicacao.service';

describe('LogsAplicacaoService', () => {
  const txMock = {
    $executeRaw: jest.fn(),
    logAplicacaoControle: { upsert: jest.fn(), update: jest.fn() },
    logAplicacao: { deleteMany: jest.fn(), create: jest.fn() },
  };
  const prismaMock = {
    user: { findUnique: jest.fn() },
    logAplicacaoControle: { findUnique: jest.fn() },
    logAplicacao: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  };

  let service: LogsAplicacaoService;

  const INPUT_BASE = {
    requestId: 'req-1',
    metodo: 'GET',
    rota: '/plantoes',
    statusHttp: 200,
    duracaoMs: 12,
    iniciadoEm: new Date('2026-09-17T10:00:00.000Z'),
    finalizadoEm: new Date('2026-09-17T10:00:00.012Z'),
    abortada: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogsAplicacaoService(prismaMock as never);
  });

  describe('registrar', () => {
    it('grava a sequência seguinte dentro do ciclo atual, sem virar o lote', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 3, quantidade: 42 });

      await service.registrar(INPUT_BASE);

      expect(txMock.logAplicacao.deleteMany).not.toHaveBeenCalled();
      expect(txMock.logAplicacao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ciclo: 3, sequencia: 43, resultado: LogAplicacaoResultado.SUCESSO }),
        }),
      );
      expect(txMock.logAplicacaoControle.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { ciclo: 3, quantidade: 43 } });
    });

    it('na 101ª requisição, apaga o lote anterior inteiro e começa o próximo ciclo em 1', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 5, quantidade: 100 });

      await service.registrar(INPUT_BASE);

      expect(txMock.logAplicacao.deleteMany).toHaveBeenCalledWith({ where: { ciclo: 5 } });
      expect(txMock.logAplicacao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ciclo: 6, sequencia: 1 }) }),
      );
      expect(txMock.logAplicacaoControle.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { ciclo: 6, quantidade: 1 } });
    });

    it('começa o primeiro ciclo do zero quando ainda não existe controle', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 1, quantidade: 0 });

      await service.registrar(INPUT_BASE);

      expect(txMock.logAplicacao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ciclo: 1, sequencia: 1 }) }),
      );
    });

    it('adquire o advisory lock antes de ler o controle do ciclo — senão o lock não protegeria a virada', async () => {
      const ordem: string[] = [];
      txMock.$executeRaw.mockImplementation(() => {
        ordem.push('lock');
        return Promise.resolve();
      });
      txMock.logAplicacaoControle.upsert.mockImplementation(() => {
        ordem.push('upsert');
        return Promise.resolve({ id: 1, ciclo: 1, quantidade: 0 });
      });

      await service.registrar(INPUT_BASE);

      expect(ordem).toEqual(['lock', 'upsert']);
    });

    it('classifica 4xx, 5xx e abortada corretamente na gravação', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 1, quantidade: 0 });

      await service.registrar({ ...INPUT_BASE, statusHttp: 404 });
      expect(txMock.logAplicacao.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ resultado: LogAplicacaoResultado.ERRO_CLIENTE }) }),
      );

      await service.registrar({ ...INPUT_BASE, statusHttp: 500 });
      expect(txMock.logAplicacao.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ resultado: LogAplicacaoResultado.ERRO_SERVIDOR }) }),
      );

      await service.registrar({ ...INPUT_BASE, statusHttp: 200, abortada: true });
      expect(txMock.logAplicacao.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resultado: LogAplicacaoResultado.ABORTADA, statusHttp: 200 }),
        }),
      );
    });

    it('associa nome/e-mail do usuário autenticado quando há usuarioId', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 1, quantidade: 0 });
      prismaMock.user.findUnique.mockResolvedValue({ nome: 'Ana Lima', email: 'ana@suri.com' });

      await service.registrar({ ...INPUT_BASE, usuarioId: 'user1' });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' }, select: { nome: true, email: true } });
      expect(txMock.logAplicacao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 'user1', usuarioNome: 'Ana Lima', usuarioEmail: 'ana@suri.com' }),
        }),
      );
    });

    it('aceita requisição pública sem usuário, sem inventar um ator', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 1, quantidade: 0 });

      await service.registrar(INPUT_BASE);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(txMock.logAplicacao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usuarioId: undefined, usuarioNome: undefined }) }),
      );
    });

    it('trunca mensagem, stack e detalhes do erro antes de persistir', async () => {
      txMock.logAplicacaoControle.upsert.mockResolvedValue({ id: 1, ciclo: 1, quantidade: 0 });

      await service.registrar({
        ...INPUT_BASE,
        statusHttp: 500,
        erro: { classe: 'Error', mensagem: 'x'.repeat(600), stack: 'y'.repeat(5000), detalhes: 'z'.repeat(600) },
      });

      const dataGravada = txMock.logAplicacao.create.mock.calls[0][0].data;
      expect(dataGravada.erroMensagem.length).toBeLessThanOrEqual(501);
      expect(dataGravada.erroStack.length).toBeLessThanOrEqual(4001);
      expect(dataGravada.erroDetalhes.length).toBeLessThanOrEqual(501);
    });
  });

  describe('listar', () => {
    it('retorna ciclo/quantidade/limite do controle e os logs mais recentes primeiro', async () => {
      prismaMock.logAplicacaoControle.findUnique.mockResolvedValue({ id: 1, ciclo: 4, quantidade: 17 });
      prismaMock.logAplicacao.findMany.mockResolvedValue([{ id: 'log1' }]);

      const resultado = await service.listar({});

      expect(resultado).toEqual({ ciclo: 4, quantidade: 17, limite: 100, logs: [{ id: 'log1' }] });
      expect(prismaMock.logAplicacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ ciclo: 'desc' }, { sequencia: 'desc' }] }),
      );
    });

    it('reporta ciclo 1 e quantidade 0 quando ainda não existe nenhuma requisição registrada', async () => {
      prismaMock.logAplicacaoControle.findUnique.mockResolvedValue(null);
      prismaMock.logAplicacao.findMany.mockResolvedValue([]);

      const resultado = await service.listar({});

      expect(resultado).toEqual({ ciclo: 1, quantidade: 0, limite: 100, logs: [] });
    });

    it('filtra por resultado, método, status, usuário e busca por rota/request id', async () => {
      prismaMock.logAplicacaoControle.findUnique.mockResolvedValue({ id: 1, ciclo: 1, quantidade: 1 });
      prismaMock.logAplicacao.findMany.mockResolvedValue([]);

      await service.listar({ resultado: 'ERRO_SERVIDOR', metodo: 'POST', statusHttp: 500, usuarioId: 'user1', busca: 'plant' });

      expect(prismaMock.logAplicacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            resultado: 'ERRO_SERVIDOR',
            metodo: 'POST',
            statusHttp: 500,
            usuarioId: 'user1',
            OR: [{ rota: { contains: 'plant', mode: 'insensitive' } }, { requestId: { contains: 'plant', mode: 'insensitive' } }],
          },
        }),
      );
    });
  });

  describe('obterDetalhe', () => {
    it('retorna o registro completo, inclusive stack', async () => {
      prismaMock.logAplicacao.findUnique.mockResolvedValue({ id: 'log1', erroStack: 'stack' });
      await expect(service.obterDetalhe('log1')).resolves.toEqual({ id: 'log1', erroStack: 'stack' });
    });

    it('lança 404 para id inexistente ou de um ciclo já apagado', async () => {
      prismaMock.logAplicacao.findUnique.mockResolvedValue(null);
      await expect(service.obterDetalhe('log-antigo')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
