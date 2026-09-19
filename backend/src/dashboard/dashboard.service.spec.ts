import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const prismaMock = {
    user: { findMany: jest.fn() },
    reserva: { count: jest.fn(), findMany: jest.fn() },
    checklistItem: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-02T12:00:00Z'));
    prismaMock.reserva.count.mockResolvedValue(0);
    prismaMock.reserva.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  afterEach(() => jest.useRealTimers());

  it('aggregates total colaboradores', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: '1', nome: 'Ana', dataNascimento: null, dataAdmissao: null },
      { id: '2', nome: 'Bia', dataNascimento: null, dataAdmissao: null },
      { id: '3', nome: 'Caio', dataNascimento: null, dataAdmissao: null },
    ]);

    const resumo = await service.getResumoAdmin();

    expect(resumo.totalColaboradores).toBe(3);
  });

  it('lists upcoming birthdays within the window, sorted by closest first', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: '1', nome: 'Ana', dataNascimento: new Date('1995-09-10T00:00:00Z'), dataAdmissao: null },
      { id: '2', nome: 'Bia', dataNascimento: new Date('1995-09-05T00:00:00Z'), dataAdmissao: null },
      { id: '3', nome: 'Caio', dataNascimento: new Date('1995-12-25T00:00:00Z'), dataAdmissao: null },
    ]);

    const resumo = await service.getResumoAdmin();

    expect(resumo.proximosAniversariantes.map((c) => c.nome)).toEqual(['Bia', 'Ana']);
  });

  it('lists upcoming work anniversaries with the completed years count', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: '1', nome: 'Ana', dataNascimento: null, dataAdmissao: new Date('2021-09-05T00:00:00Z') },
    ]);

    const resumo = await service.getResumoAdmin();

    expect(resumo.proximosAniversariosCasa).toEqual([
      expect.objectContaining({ nome: 'Ana', anos: 5 }),
    ]);
  });

  it('conta as reservas pendentes e lista os agendamentos de hoje e amanhã', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.reserva.count.mockResolvedValue(3);
    prismaMock.reserva.findMany.mockResolvedValue([
      {
        id: 'r1',
        data: new Date('2026-09-02T00:00:00Z'),
        horaInicio: '10:00',
        horaFim: '11:00',
        sala: { nome: 'Sala Azul' },
        solicitante: { nome: 'Ana' },
      },
    ]);

    const resumo = await service.getResumoAdmin();

    expect(resumo.agendamentos.pendentes).toBe(3);
    expect(resumo.agendamentos.proximas).toEqual([
      expect.objectContaining({ id: 'r1', sala: 'Sala Azul', solicitante: 'Ana', horaInicio: '10:00' }),
    ]);
    expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'CONFIRMADA',
          data: { gte: new Date('2026-09-02T00:00:00.000Z'), lte: new Date('2026-09-03T00:00:00.000Z') },
        }),
      }),
    );
  });

  describe('getResumoEquipe', () => {
    it('escopa aniversariantes e total de liderados a gestorId', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: '1', nome: 'Ana', dataNascimento: new Date('1995-09-05T00:00:00Z') },
      ]);
      prismaMock.checklistItem.count.mockResolvedValue(2);

      const resumo = await service.getResumoEquipe('gestor1');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { gestorId: 'gestor1', ativo: true, statusColaborador: { not: 'PENDENTE' } } }),
      );
      expect(prismaMock.checklistItem.count).toHaveBeenCalledWith({
        where: { status: 'PENDENTE', tipo: 'ADMISSAO', user: { gestorId: 'gestor1' } },
      });
      expect(resumo.totalLiderados).toBe(1);
      expect(resumo.checklistPendente).toBe(2);
      expect(resumo.proximosAniversariantes.map((c) => c.nome)).toEqual(['Ana']);
    });
  });
});
