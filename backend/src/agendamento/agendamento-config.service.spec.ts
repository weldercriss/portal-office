import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AgendamentoConfigService } from './agendamento-config.service';

describe('AgendamentoConfigService', () => {
  let service: AgendamentoConfigService;

  const prismaMock = {
    agendamentoConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AgendamentoConfigService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(AgendamentoConfigService);
  });

  it('assume solicitação desabilitada enquanto a configuração ainda não existe', async () => {
    prismaMock.agendamentoConfig.findUnique.mockResolvedValue(null);

    await expect(service.get()).resolves.toEqual({ permiteSolicitacaoColaborador: false });
  });

  it('persiste a configuração na linha global', async () => {
    prismaMock.agendamentoConfig.upsert.mockResolvedValue({ permiteSolicitacaoColaborador: true });

    await expect(service.update({ permiteSolicitacaoColaborador: true })).resolves.toEqual({
      permiteSolicitacaoColaborador: true,
    });
    expect(prismaMock.agendamentoConfig.upsert).toHaveBeenCalledWith({
      where: { id: 'global' },
      create: { id: 'global', permiteSolicitacaoColaborador: true },
      update: { permiteSolicitacaoColaborador: true },
    });
  });
});
