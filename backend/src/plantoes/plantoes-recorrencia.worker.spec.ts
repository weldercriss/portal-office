import { PlantoesRecorrenciaWorker } from './plantoes-recorrencia.worker';

describe('PlantoesRecorrenciaWorker', () => {
  const prismaMock = {
    plantaoSerie: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    tipoPlantao: { findMany: jest.fn() },
    plantao: { findMany: jest.fn(), createMany: jest.fn() },
  };
  let worker: PlantoesRecorrenciaWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.plantaoSerie.findMany.mockResolvedValue([]);
    prismaMock.tipoPlantao.findMany.mockResolvedValue([]);
    prismaMock.plantao.findMany.mockResolvedValue([]);
    worker = new PlantoesRecorrenciaWorker(prismaMock as never);
  });

  describe('fecharSeriesOrfas', () => {
    it('fecha séries abertas de tipo inativo ou não-recorrente, um dia antes de hoje', async () => {
      prismaMock.plantaoSerie.findMany.mockResolvedValue([{ id: 'serie1' }, { id: 'serie2' }]);

      await (worker as any).fecharSeriesOrfas();

      expect(prismaMock.plantaoSerie.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['serie1', 'serie2'] } },
        data: { dataFim: expect.any(Date) },
      });
    });

    it('não toca em nada quando não há série órfã', async () => {
      await (worker as any).fecharSeriesOrfas();
      expect(prismaMock.plantaoSerie.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('reconciliarSeriesAtivas', () => {
    it('abre uma série pro tipo ativo recorrente que ainda não tem uma', async () => {
      prismaMock.tipoPlantao.findMany.mockResolvedValue([
        { id: 'tipo1', nome: 'Suporte', diasSemana: [1, 3, 5], criadoPorId: 'admin1', series: [] },
      ]);

      await (worker as any).reconciliarSeriesAtivas();

      expect(prismaMock.plantaoSerie.create).toHaveBeenCalledWith({
        data: {
          tipoPlantaoId: 'tipo1',
          dataInicio: expect.any(Date),
          dataFim: null,
          diasSemana: [1, 3, 5],
          criadoPorId: 'admin1',
        },
      });
    });

    it('não mexe na série aberta quando o diasSemana do tipo não mudou', async () => {
      prismaMock.tipoPlantao.findMany.mockResolvedValue([
        {
          id: 'tipo1',
          nome: 'Suporte',
          diasSemana: [1, 3, 5],
          criadoPorId: 'admin1',
          series: [{ id: 'serieAtual', diasSemana: [5, 1, 3], criadoPorId: 'admin1' }],
        },
      ]);

      await (worker as any).reconciliarSeriesAtivas();

      expect(prismaMock.plantaoSerie.create).not.toHaveBeenCalled();
      expect(prismaMock.plantaoSerie.update).not.toHaveBeenCalled();
    });

    it('fecha a série antiga e abre outra quando o diasSemana do tipo mudou', async () => {
      prismaMock.tipoPlantao.findMany.mockResolvedValue([
        {
          id: 'tipo1',
          nome: 'Suporte',
          diasSemana: [2, 4],
          criadoPorId: 'admin1',
          series: [{ id: 'serieAntiga', diasSemana: [1, 3, 5], criadoPorId: 'admin1' }],
        },
      ]);

      await (worker as any).reconciliarSeriesAtivas();

      expect(prismaMock.plantaoSerie.update).toHaveBeenCalledWith({
        where: { id: 'serieAntiga' },
        data: { dataFim: expect.any(Date) },
      });
      expect(prismaMock.plantaoSerie.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tipoPlantaoId: 'tipo1', diasSemana: [2, 4] }) }),
      );
    });

    it('não abre série pra tipo sem autor registrado e sem série anterior', async () => {
      prismaMock.tipoPlantao.findMany.mockResolvedValue([
        { id: 'tipo1', nome: 'Suporte antigo', diasSemana: [1], criadoPorId: null, series: [] },
      ]);

      await (worker as any).reconciliarSeriesAtivas();

      expect(prismaMock.plantaoSerie.create).not.toHaveBeenCalled();
    });
  });

  describe('completarOcorrencias', () => {
    it('cria só as ocorrências que ainda não existem pra série', async () => {
      const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
      prismaMock.plantaoSerie.findMany.mockResolvedValue([
        {
          id: 'serie1',
          tipoPlantaoId: 'tipo1',
          dataInicio: hoje,
          dataFim: null,
          diasSemana: [0, 1, 2, 3, 4, 5, 6],
          criadoPorId: 'admin1',
          tipoPlantao: { regra: 'SEMANAL' },
        },
      ]);
      // Já existe ocorrência gerada pra hoje — não deve duplicar.
      prismaMock.plantao.findMany.mockResolvedValue([{ data: hoje }]);

      await (worker as any).completarOcorrencias();

      expect(prismaMock.plantao.createMany).toHaveBeenCalled();
      const [{ data: criados }] = prismaMock.plantao.createMany.mock.calls[0]!;
      expect(criados.every((p: { data: Date }) => p.data.getTime() !== hoje.getTime())).toBe(true);
      expect(criados.every((p: any) => p.serieId === 'serie1' && p.criadoPorId === 'admin1')).toBe(true);
    });

    it('não chama createMany quando todas as ocorrências já existem', async () => {
      const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
      prismaMock.plantaoSerie.findMany.mockResolvedValue([
        {
          id: 'serie1',
          tipoPlantaoId: 'tipo1',
          dataInicio: hoje,
          dataFim: hoje,
          diasSemana: [hoje.getUTCDay()],
          criadoPorId: 'admin1',
          tipoPlantao: { regra: 'SEMANAL' },
        },
      ]);
      prismaMock.plantao.findMany.mockResolvedValue([{ data: hoje }]);

      await (worker as any).completarOcorrencias();

      expect(prismaMock.plantao.createMany).not.toHaveBeenCalled();
    });
  });
});
