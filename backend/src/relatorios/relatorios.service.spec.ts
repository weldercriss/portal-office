import { Test } from '@nestjs/testing';
import { RelatoriosService } from './relatorios.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RelatoriosService', () => {
  let service: RelatoriosService;
  const prismaMock = { user: { findMany: jest.fn() } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [RelatoriosService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(RelatoriosService);
  });

  it('agrupa admissões e desligamentos por mês', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { dataAdmissao: new Date('2026-01-10T00:00:00Z'), dataDesligamento: null },
      { dataAdmissao: new Date('2026-01-20T00:00:00Z'), dataDesligamento: null },
      { dataAdmissao: new Date('2025-11-01T00:00:00Z'), dataDesligamento: new Date('2026-02-15T00:00:00Z') },
    ]);

    const resultado = await service.getTurnover({});

    expect(resultado).toEqual([
      { mes: '2025-11', admissoes: 1, desligamentos: 0 },
      { mes: '2026-01', admissoes: 2, desligamentos: 0 },
      { mes: '2026-02', admissoes: 0, desligamentos: 1 },
    ]);
  });

  it('filtra fora do intervalo de/ate', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { dataAdmissao: new Date('2026-01-10T00:00:00Z'), dataDesligamento: null },
      { dataAdmissao: new Date('2026-05-10T00:00:00Z'), dataDesligamento: null },
    ]);

    const resultado = await service.getTurnover({ de: '2026-02', ate: '2026-06' });

    expect(resultado).toEqual([{ mes: '2026-05', admissoes: 1, desligamentos: 0 }]);
  });

  it('exclui MASTER e filtra por departamento na query', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    await service.getTurnover({ departamentoId: 'g1' });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { not: 'MASTER' },
          statusColaborador: { not: 'PENDENTE' },
          groupId: 'g1',
        }),
      }),
    );
  });

  describe('getColaboradores', () => {
    it('agrupa por departamento e agrega aniversariantes por mês no ano inteiro', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-02T12:00:00Z'));
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: '1',
          nome: 'Ana',
          dataNascimento: new Date('1995-09-10T00:00:00Z'),
          dataAdmissao: new Date('2021-09-05T00:00:00Z'),
          group: { id: 'g1', nome: 'CS' },
        },
        {
          id: '2',
          nome: 'Bia',
          dataNascimento: new Date('1990-01-25T00:00:00Z'),
          dataAdmissao: null,
          group: { id: 'g1', nome: 'CS' },
        },
        { id: '3', nome: 'Caio', dataNascimento: null, dataAdmissao: null, group: null },
      ]);

      const resultado = await service.getColaboradores({});

      expect(resultado.totalColaboradores).toBe(3);
      expect(resultado.porDepartamento).toEqual(
        expect.arrayContaining([
          { departamentoId: 'g1', departamento: 'CS', total: 2 },
          { departamentoId: null, departamento: 'Sem departamento', total: 1 },
        ]),
      );
      expect(resultado.aniversariantesPorMes).toHaveLength(12);
      expect(resultado.aniversariantesPorMes[8]).toEqual({ mes: 8, total: 1 });
      expect(resultado.aniversariantesPorMes[0]).toEqual({ mes: 0, total: 1 });
      // Ordenado por dia no calendário (mês/dia), não pela data mais próxima de hoje.
      expect(resultado.aniversariantes.map((a) => a.nome)).toEqual(['Bia', 'Ana']);
      expect(resultado.aniversariosCasa).toEqual([expect.objectContaining({ nome: 'Ana', anos: 4 })]);
      jest.useRealTimers();
    });

    it('filtra por departamento na query', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.getColaboradores({ departamentoId: 'g1' });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ativo: true, statusColaborador: { not: 'PENDENTE' }, groupId: 'g1' }),
        }),
      );
    });
  });
});
