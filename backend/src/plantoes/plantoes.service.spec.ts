import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlantoesService } from './plantoes.service';
import { AgendaGoogleService } from '../agenda-google/agenda-google.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { SolicitacoesService } from '../solicitacoes/solicitacoes.service';

describe('PlantoesService', () => {
  let service: PlantoesService;
  const prismaMock: any = {
    plantao: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    trocaPlantao: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    turno: { findUnique: jest.fn() },
    tipoPlantao: { findUnique: jest.fn() },
    plantaoSerie: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  };
  prismaMock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prismaMock) : Promise.all(arg as Promise<unknown>[]),
  );
  const notificacoesMock = { criar: jest.fn(), criarParaAdmins: jest.fn() };
  const solicitacoesMock = { existeAfastamentoNoPeriodo: jest.fn().mockResolvedValue(null) };
  const agendaMock = { enfileirar: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    solicitacoesMock.existeAfastamentoNoPeriodo.mockResolvedValue(null);
    prismaMock.turno.findUnique.mockResolvedValue({ id: 'turno1', ativo: true });
    prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 'tipo1', ativo: true, regra: 'UNICO' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlantoesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesService, useValue: notificacoesMock },
        { provide: SolicitacoesService, useValue: solicitacoesMock },
        { provide: AgendaGoogleService, useValue: agendaMock },
      ],
    }).compile();
    service = moduleRef.get(PlantoesService);
  });

  describe('create', () => {
    it('rejects publishing a plantão without a plantonista linked', async () => {
      await expect(
        service.create({ data: '2026-09-01', status: 'PUBLICADO' } as any, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.plantao.create).not.toHaveBeenCalled();
    });

    it('allows saving a draft without a plantonista linked', async () => {
      prismaMock.plantao.create.mockResolvedValue({ id: '1', userId: null, data: new Date('2026-09-01') });
      await service.create(
        { data: '2026-09-01', status: 'RASCUNHO', turnoId: 'turno1', tipoPlantaoId: 'tipo1' } as any,
        'admin1',
      );
      expect(prismaMock.plantao.create).toHaveBeenCalled();
      expect(notificacoesMock.criar).not.toHaveBeenCalled();
    });

    it('notifies the plantonista when linked on creation', async () => {
      prismaMock.plantao.create.mockResolvedValue({ id: '1', userId: 'u1', data: new Date('2026-09-01') });
      await service.create(
        { data: '2026-09-01', status: 'PUBLICADO', userId: 'u1', turnoId: 'turno1', tipoPlantaoId: 'tipo1' } as any,
        'admin1',
      );
      expect(notificacoesMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', tipo: 'PLANTAO_VINCULADO' }),
      );
    });

    it('rejects linking a plantonista with an active afastamento on that date', async () => {
      solicitacoesMock.existeAfastamentoNoPeriodo.mockResolvedValue({ id: 'o1', tipo: { nome: 'Atestado Médico' } });
      await expect(
        service.create(
          { data: '2026-09-01', status: 'RASCUNHO', userId: 'u1', turnoId: 'turno1', tipoPlantaoId: 'tipo1' } as any,
          'admin1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.plantao.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid or inactive turno', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ id: 'turno1', ativo: false });
      await expect(
        service.create(
          { data: '2026-09-01', status: 'RASCUNHO', turnoId: 'turno1', tipoPlantaoId: 'tipo1' } as any,
          'admin1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.plantao.create).not.toHaveBeenCalled();
    });

    it('generates weekly occurrences only on the selected weekdays', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 'tipo1', ativo: true, regra: 'SEMANAL' });
      prismaMock.plantaoSerie.create.mockResolvedValue({ id: 'serie1' });
      prismaMock.plantao.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: data.data.toISOString() }));

      // Intervalo de exatamente 14 dias (2 semanas cheias): qualquer dia da semana aparece exatamente 2x,
      // então o teste não depende de saber em que dia da semana cai 2026-09-01.
      const resultado = await service.create(
        {
          data: '2026-09-01',
          dataFim: '2026-09-14',
          diasSemana: [0, 6],
          turnoId: 'turno1',
          tipoPlantaoId: 'tipo1',
          status: 'RASCUNHO',
        } as any,
        'admin1',
      );

      expect(prismaMock.plantao.create).toHaveBeenCalledTimes(4);
      expect((resultado as any).quantidade).toBe(4);
      expect((resultado as any).serieId).toBe('serie1');
    });

    it('clamps monthly recurrence to the last day of shorter months', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 'tipo1', ativo: true, regra: 'MENSAL' });
      prismaMock.plantaoSerie.create.mockResolvedValue({ id: 'serie1' });
      prismaMock.plantao.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data }));

      await service.create(
        { data: '2026-01-31', dataFim: '2026-04-30', turnoId: 'turno1', tipoPlantaoId: 'tipo1', status: 'RASCUNHO' } as any,
        'admin1',
      );

      const datasGeradas = prismaMock.plantao.create.mock.calls.map((call: any) => call[0].data.data.toISOString().slice(0, 10));
      expect(datasGeradas).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    });

    it('rejects a recurrence that would generate more occurrences than the cap', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 'tipo1', ativo: true, regra: 'SEMANAL' });
      await expect(
        service.create(
          {
            data: '2020-01-01',
            dataFim: '2030-01-01',
            diasSemana: [0, 1, 2, 3, 4, 5, 6],
            turnoId: 'turno1',
            tipoPlantaoId: 'tipo1',
            status: 'RASCUNHO',
          } as any,
          'admin1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.plantao.create).not.toHaveBeenCalled();
    });

    it('rejects the whole batch when any generated date conflicts with an approved afastamento', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 'tipo1', ativo: true, regra: 'SEMANAL' });
      solicitacoesMock.existeAfastamentoNoPeriodo
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'o1', tipo: { nome: 'Férias' } })
        .mockResolvedValue(null);

      await expect(
        service.create(
          {
            data: '2026-09-01',
            dataFim: '2026-09-14',
            diasSemana: [0, 6],
            userId: 'u1',
            turnoId: 'turno1',
            tipoPlantaoId: 'tipo1',
            status: 'RASCUNHO',
          } as any,
          'admin1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.plantao.create).not.toHaveBeenCalled();
    });
  });

  describe('removeSerie', () => {
    it('throws when the series is not found', async () => {
      prismaMock.plantaoSerie.findUnique.mockResolvedValue(null);
      await expect(service.removeSerie('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes the series and reports how many occurrences were removed', async () => {
      prismaMock.plantaoSerie.findUnique.mockResolvedValue({
        id: 'serie1',
        _count: { plantoes: 4 },
        plantoes: [{ id: 'p1' }, { id: 'p2' }],
      });
      prismaMock.plantaoSerie.delete.mockResolvedValue({});

      const resultado = await service.removeSerie('serie1');

      expect(prismaMock.plantaoSerie.delete).toHaveBeenCalledWith({ where: { id: 'serie1' } });
      expect(resultado).toEqual({ ok: true, removidos: 4 });
      // A agenda precisa limpar os eventos dos plantões que sumiram com a série.
      expect(agendaMock.enfileirar).toHaveBeenCalledWith(['p1', 'p2']);
    });
  });

  describe('solicitarTroca', () => {
    it('rejects when the caller does not own the origin plantão', async () => {
      prismaMock.plantao.findUnique
        .mockResolvedValueOnce({ id: 'origem', userId: 'other', data: new Date() })
        .mockResolvedValueOnce({ id: 'destino', userId: 'u2', data: new Date() });
      await expect(service.solicitarTroca('origem', 'destino', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the destination plantão has no plantonista', async () => {
      prismaMock.plantao.findUnique
        .mockResolvedValueOnce({ id: 'origem', userId: 'u1', data: new Date() })
        .mockResolvedValueOnce({ id: 'destino', userId: null, data: new Date() });
      await expect(service.solicitarTroca('origem', 'destino', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates the trade request and notifies destinatario + admins', async () => {
      prismaMock.plantao.findUnique
        .mockResolvedValueOnce({ id: 'origem', userId: 'u1', data: new Date('2026-09-01'), user: { nome: 'Ana' } })
        .mockResolvedValueOnce({ id: 'destino', userId: 'u2', data: new Date('2026-09-05'), user: { nome: 'Bia' } });
      prismaMock.trocaPlantao.create.mockResolvedValue({ id: 't1' });
      await service.solicitarTroca('origem', 'destino', 'u1');
      expect(prismaMock.trocaPlantao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ solicitanteId: 'u1', destinatarioId: 'u2' }) }),
      );
      expect(notificacoesMock.criar).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2', tipo: 'TROCA_SOLICITADA' }));
      expect(notificacoesMock.criarParaAdmins).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'TROCA_SOLICITADA' }));
    });
  });

  describe('aceitarTroca', () => {
    it('rejects when the caller is not the invited plantonista', async () => {
      prismaMock.trocaPlantao.findUnique.mockResolvedValue({ id: 't1', destinatarioId: 'u2', status: 'PENDENTE' });
      await expect(service.aceitarTroca('t1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects responding to a trade already resolved', async () => {
      prismaMock.trocaPlantao.findUnique.mockResolvedValue({ id: 't1', destinatarioId: 'u2', status: 'ACEITA' });
      await expect(service.aceitarTroca('t1', 'u2')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('swaps the plantonistas of both plantões and notifies solicitante + admins', async () => {
      prismaMock.trocaPlantao.findUnique.mockResolvedValue({
        id: 't1',
        status: 'PENDENTE',
        plantaoOrigemId: 'origem',
        plantaoDestinoId: 'destino',
        solicitanteId: 'u1',
        destinatarioId: 'u2',
        plantaoOrigem: { data: new Date('2026-09-01') },
        plantaoDestino: { data: new Date('2026-09-05') },
        destinatario: { nome: 'Bia' },
      });
      prismaMock.plantao.update.mockResolvedValue({});
      prismaMock.trocaPlantao.update.mockResolvedValue({ id: 't1', status: 'ACEITA' });

      await service.aceitarTroca('t1', 'u2');

      expect(prismaMock.plantao.update).toHaveBeenCalledWith({
        where: { id: 'origem' },
        data: { userId: 'u2' },
      });
      expect(prismaMock.plantao.update).toHaveBeenCalledWith({
        where: { id: 'destino' },
        data: { userId: 'u1' },
      });
      expect(notificacoesMock.criar).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', tipo: 'TROCA_ACEITA' }));
      expect(notificacoesMock.criarParaAdmins).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'TROCA_ACEITA' }));
    });
  });

  it('throws when a plantão is not found', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
