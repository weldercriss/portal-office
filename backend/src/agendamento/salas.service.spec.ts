import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SalasService } from './salas.service';

// 2026-09-09 é uma quarta-feira (3).
const QUARTA = '2026-09-09';

describe('SalasService', () => {
  let service: SalasService;

  const prismaMock: any = {
    sala: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    salaDisponibilidade: { deleteMany: jest.fn(), createMany: jest.fn() },
    reserva: { findMany: jest.fn() },
  };
  prismaMock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prismaMock) : Promise.all(arg as Promise<unknown>[]),
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.sala.create.mockResolvedValue({ id: 'sala1' });
    prismaMock.sala.update.mockResolvedValue({ id: 'sala1' });
    prismaMock.reserva.findMany.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [SalasService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(SalasService);
  });

  describe('create', () => {
    it('assume 60 minutos quando a duração do horário não vem informada', async () => {
      await service.create({
        nome: 'Sala Azul',
        disponibilidades: [{ diaSemana: 3, horaInicio: '09:00', horaFim: '12:00' }],
      } as any);

      const criadas = prismaMock.sala.create.mock.calls[0][0].data.disponibilidades.create;
      expect(criadas).toEqual([{ diaSemana: 3, horaInicio: '09:00', horaFim: '12:00', duracaoMinutos: 60 }]);
    });

    it('recusa janela que termina antes de começar', async () => {
      await expect(
        service.create({
          nome: 'Sala Azul',
          disponibilidades: [{ diaSemana: 3, horaInicio: '12:00', horaFim: '09:00' }],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa duração maior que a própria janela', async () => {
      await expect(
        service.create({
          nome: 'Sala Azul',
          disponibilidades: [{ diaSemana: 3, horaInicio: '09:00', horaFim: '10:00', duracaoMinutos: 120 }],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa janelas sobrepostas no mesmo dia da semana', async () => {
      await expect(
        service.create({
          nome: 'Sala Azul',
          disponibilidades: [
            { diaSemana: 3, horaInicio: '09:00', horaFim: '12:00' },
            { diaSemana: 3, horaInicio: '11:00', horaFim: '14:00' },
          ],
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prismaMock.sala.findUnique.mockResolvedValue({ id: 'sala1', disponibilidades: [] });
    });

    it('preserva a grade atual quando disponibilidades não vêm no corpo', async () => {
      await service.update('sala1', { nome: 'Sala Verde' } as any);
      expect(prismaMock.salaDisponibilidade.deleteMany).not.toHaveBeenCalled();
    });

    it('substitui a grade inteira quando disponibilidades vêm no corpo', async () => {
      await service.update('sala1', {
        disponibilidades: [{ diaSemana: 4, horaInicio: '13:00', horaFim: '18:00' }],
      } as any);

      expect(prismaMock.salaDisponibilidade.deleteMany).toHaveBeenCalledWith({ where: { salaId: 'sala1' } });
      expect(prismaMock.salaDisponibilidade.createMany).toHaveBeenCalledWith({
        data: [{ salaId: 'sala1', diaSemana: 4, horaInicio: '13:00', horaFim: '18:00', duracaoMinutos: 60 }],
      });
    });

    it('esvazia a grade quando a lista vem vazia', async () => {
      await service.update('sala1', { disponibilidades: [] } as any);
      expect(prismaMock.salaDisponibilidade.deleteMany).toHaveBeenCalled();
      expect(prismaMock.salaDisponibilidade.createMany).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe('deletePermanently', () => {
    it('recusa excluir sala com reserva registrada', async () => {
      prismaMock.sala.findUnique.mockResolvedValue({ id: 'sala1', _count: { reservas: 2 } });
      await expect(service.deletePermanently('sala1')).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.sala.delete).not.toHaveBeenCalled();
    });

    it('exclui sala sem histórico', async () => {
      prismaMock.sala.findUnique.mockResolvedValue({ id: 'sala1', _count: { reservas: 0 } });
      await expect(service.deletePermanently('sala1')).resolves.toEqual({ success: true });
    });

    it('falha quando a sala não existe', async () => {
      prismaMock.sala.findUnique.mockResolvedValue(null);
      await expect(service.deletePermanently('sala1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('horariosDisponiveis', () => {
    beforeEach(() => {
      prismaMock.sala.findUnique.mockResolvedValue({
        id: 'sala1',
        disponibilidades: [{ diaSemana: 3, horaInicio: '09:00', horaFim: '12:00', duracaoMinutos: 60 }],
      });
    });

    it('marca como indisponível o horário já reservado', async () => {
      prismaMock.reserva.findMany.mockResolvedValue([{ horaInicio: '10:00', horaFim: '11:00' }]);
      const horarios = await service.horariosDisponiveis('sala1', QUARTA);

      expect(horarios.map((h) => `${h.horaInicio} ${h.disponivel}`)).toEqual([
        '09:00 true',
        '10:00 false',
        '11:00 true',
      ]);
    });

    it('deixa a própria reserva fora da conta ao editá-la', async () => {
      await service.horariosDisponiveis('sala1', QUARTA, 'r1');
      expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: 'r1' } }) }),
      );
    });

    it('só conta reservas que ainda ocupam o horário', async () => {
      await service.horariosDisponiveis('sala1', QUARTA);
      expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { in: ['SOLICITADA', 'CONFIRMADA'] } }) }),
      );
    });
  });
});
