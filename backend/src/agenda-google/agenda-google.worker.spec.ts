import { AgendaGoogleWorker } from './agenda-google.worker';

const SEM_FALHAS = { falhas: [] };

describe('AgendaGoogleWorker', () => {
  const prismaMock = { agendaSyncPendente: { findMany: jest.fn(), update: jest.fn(), delete: jest.fn() } };
  const agendaMock = { habilitado: true, sincronizar: jest.fn() };
  let worker: AgendaGoogleWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    agendaMock.habilitado = true;
    agendaMock.sincronizar.mockResolvedValue(SEM_FALHAS);
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([]);
    worker = new AgendaGoogleWorker(prismaMock as never, agendaMock as never);
  });

  it('não consulta a fila com a integração desligada', async () => {
    agendaMock.habilitado = false;
    await worker.processarPendencias();
    expect(prismaMock.agendaSyncPendente.findMany).not.toHaveBeenCalled();
  });

  it('ignora pendências vencidas, esgotadas ou paradas à espera de reconexão', async () => {
    await worker.processarPendencias();
    const { where } = prismaMock.agendaSyncPendente.findMany.mock.calls[0]![0];
    expect(where.proximaTentativa.lte).toBeInstanceOf(Date);
    expect(where.tentativas).toEqual({ lt: 10 });
    expect(where.aguardandoReconexaoUserId).toBeNull();
  });

  it('apaga a pendência depois de sincronizar', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([{ id: 's1', plantaoId: 'p1', tentativas: 0 }]);

    await worker.processarPendencias();

    expect(agendaMock.sincronizar).toHaveBeenCalledWith('p1');
    expect(prismaMock.agendaSyncPendente.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('adia com espera crescente e guarda o erro', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([{ id: 's1', plantaoId: 'p1', tentativas: 2 }]);
    agendaMock.sincronizar.mockRejectedValue(new Error('403 quota'));

    const antes = Date.now();
    await worker.processarPendencias();

    const { data } = prismaMock.agendaSyncPendente.update.mock.calls[0]![0];
    expect(data.tentativas).toBe(3);
    expect(data.ultimoErro).toContain('403 quota');
    // Terceira tentativa: 2^3 = 8 minutos.
    const esperaMin = (data.proximaTentativa.getTime() - antes) / 60_000;
    expect(esperaMin).toBeGreaterThan(7.5);
    expect(esperaMin).toBeLessThan(8.5);
    expect(prismaMock.agendaSyncPendente.delete).not.toHaveBeenCalled();
  });

  it('limita a espera em uma hora', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([{ id: 's1', plantaoId: 'p1', tentativas: 8 }]);
    agendaMock.sincronizar.mockRejectedValue(new Error('indisponível'));

    const antes = Date.now();
    await worker.processarPendencias();

    const { data } = prismaMock.agendaSyncPendente.update.mock.calls[0]![0];
    const esperaMin = (data.proximaTentativa.getTime() - antes) / 60_000;
    expect(esperaMin).toBeLessThan(60.5);
    expect(esperaMin).toBeGreaterThan(59.5);
  });

  it('repete a falha transitória sem apagar a pendência', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([{ id: 's1', plantaoId: 'p1', tentativas: 1 }]);
    agendaMock.sincronizar.mockResolvedValue({
      falhas: [{ userId: 'u1', motivo: 'TRANSITORIA', mensagem: 'socket hang up' }],
    });

    await worker.processarPendencias();

    const { data } = prismaMock.agendaSyncPendente.update.mock.calls[0]![0];
    expect(data.tentativas).toBe(2);
    expect(data.ultimoErro).toContain('socket hang up');
    expect(prismaMock.agendaSyncPendente.delete).not.toHaveBeenCalled();
  });

  it('para a pendência que só depende de reconexão, sem queimar tentativas', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([{ id: 's1', plantaoId: 'p1', tentativas: 4 }]);
    agendaMock.sincronizar.mockResolvedValue({
      falhas: [{ userId: 'u1', motivo: 'RECONEXAO', mensagem: 'invalid_grant' }],
    });

    await worker.processarPendencias();

    const { data } = prismaMock.agendaSyncPendente.update.mock.calls[0]![0];
    expect(data.aguardandoReconexaoUserId).toBe('u1');
    expect(data.tentativas).toBeUndefined();
    expect(prismaMock.agendaSyncPendente.delete).not.toHaveBeenCalled();
  });

  it('mistura de falhas continua na repetição normal', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([{ id: 's1', plantaoId: 'p1', tentativas: 0 }]);
    agendaMock.sincronizar.mockResolvedValue({
      falhas: [
        { userId: 'u1', motivo: 'RECONEXAO', mensagem: 'invalid_grant' },
        { userId: 'u2', motivo: 'TRANSITORIA', mensagem: '429' },
      ],
    });

    await worker.processarPendencias();

    const { data } = prismaMock.agendaSyncPendente.update.mock.calls[0]![0];
    expect(data.aguardandoReconexaoUserId).toBeUndefined();
    expect(data.tentativas).toBe(1);
  });

  it('uma falha não impede as demais pendências do lote', async () => {
    prismaMock.agendaSyncPendente.findMany.mockResolvedValue([
      { id: 's1', plantaoId: 'p1', tentativas: 0 },
      { id: 's2', plantaoId: 'p2', tentativas: 0 },
    ]);
    agendaMock.sincronizar.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(SEM_FALHAS);

    await worker.processarPendencias();

    expect(agendaMock.sincronizar).toHaveBeenCalledTimes(2);
    expect(prismaMock.agendaSyncPendente.delete).toHaveBeenCalledWith({ where: { id: 's2' } });
  });
});
