import { Test } from '@nestjs/testing';
import { DocumentosService } from './documentos.service';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN = { id: 'admin1', role: 'ADMIN' };
const MASTER = { id: 'master1', role: 'MASTER' };

describe('DocumentosService', () => {
  let service: DocumentosService;
  const prismaMock = {
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [DocumentosService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(DocumentosService);
  });

  describe('findResumo', () => {
    it('esconde usuários MASTER da Central de Documentos para quem não é master', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.findResumo(ADMIN);
      const where = prismaMock.user.findMany.mock.calls[0][0].where;
      expect(where.role).toEqual({ not: 'MASTER' });
    });

    it('não filtra por role quando quem consulta é MASTER', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.findResumo(MASTER);
      const where = prismaMock.user.findMany.mock.calls[0][0].where;
      expect(where.role).toBeUndefined();
    });
  });
});
