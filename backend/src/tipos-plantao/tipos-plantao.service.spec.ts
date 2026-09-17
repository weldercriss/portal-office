import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TiposPlantaoService } from './tipos-plantao.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TiposPlantaoService', () => {
  let service: TiposPlantaoService;
  const prismaMock = {
    tipoPlantao: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TiposPlantaoService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(TiposPlantaoService);
  });

  describe('create', () => {
    it('rejects regra SEMANAL sem nenhum dia da semana selecionado', async () => {
      await expect(
        service.create({ nome: 'Suporte', horaInicio: '08:00', horaFim: '18:00', regra: 'SEMANAL' } as any, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.tipoPlantao.create).not.toHaveBeenCalled();
    });

    it('grava o autor junto com o tipo', async () => {
      prismaMock.tipoPlantao.create.mockResolvedValue({ id: 't1' });
      await service.create({ nome: 'Suporte', horaInicio: '08:00', horaFim: '18:00', regra: 'UNICO' } as any, 'admin1');
      expect(prismaMock.tipoPlantao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ criadoPorId: 'admin1' }),
      });
    });
  });

  describe('update', () => {
    it('throws when the tipo does not exist', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {} as any, 'admin1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('valida diasSemana usando a regra já salva quando a regra não muda no update', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 't1', regra: 'SEMANAL', diasSemana: [] });
      await expect(service.update('t1', { ativo: false } as any, 'admin1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.tipoPlantao.update).not.toHaveBeenCalled();
    });

    it('allows a plain ativo toggle when diasSemana already satisfies a saved SEMANAL regra', async () => {
      prismaMock.tipoPlantao.findUnique.mockResolvedValue({ id: 't1', regra: 'SEMANAL', diasSemana: [1, 3] });
      prismaMock.tipoPlantao.update.mockResolvedValue({ id: 't1', ativo: false });
      await service.update('t1', { ativo: false } as any, 'admin1');
      expect(prismaMock.tipoPlantao.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: expect.objectContaining({ ativo: false, criadoPorId: 'admin1' }),
      });
    });
  });
});
