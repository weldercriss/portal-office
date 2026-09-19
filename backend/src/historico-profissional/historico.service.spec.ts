import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HistoricoService } from './historico.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HistoricoService', () => {
  let service: HistoricoService;
  const prismaMock = {
    historicoProfissional: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [HistoricoService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(HistoricoService);
  });

  describe('update', () => {
    it('lança NotFoundException quando o registro não existe', async () => {
      prismaMock.historicoProfissional.findUnique.mockResolvedValue(null);
      await expect(service.update('h1', { cargo: 'Novo cargo' })).rejects.toThrow(NotFoundException);
    });

    it('dataFim=null limpa a data final (marca como cargo atual)', async () => {
      prismaMock.historicoProfissional.findUnique.mockResolvedValue({ id: 'h1' });
      prismaMock.historicoProfissional.update.mockResolvedValue({});
      await service.update('h1', { dataFim: null });
      expect(prismaMock.historicoProfissional.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dataFim: null }) }),
      );
    });

    it('dataFim como string converte para Date', async () => {
      prismaMock.historicoProfissional.findUnique.mockResolvedValue({ id: 'h1' });
      prismaMock.historicoProfissional.update.mockResolvedValue({});
      await service.update('h1', { dataFim: '2024-01-01' });
      const dataArg = prismaMock.historicoProfissional.update.mock.calls[0][0].data;
      expect(dataArg.dataFim).toBeInstanceOf(Date);
    });

    it('dataFim ausente não altera o valor já salvo', async () => {
      prismaMock.historicoProfissional.findUnique.mockResolvedValue({ id: 'h1' });
      prismaMock.historicoProfissional.update.mockResolvedValue({});
      await service.update('h1', { cargo: 'Novo cargo' });
      expect(prismaMock.historicoProfissional.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dataFim: undefined }) }),
      );
    });
  });
});
