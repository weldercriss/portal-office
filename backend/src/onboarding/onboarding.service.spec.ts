import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TipoChecklist } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN = { id: 'admin1', role: 'ADMIN' };
const GESTOR = { id: 'gestor1', role: 'GESTOR' };
const USER = { id: 'u1', role: 'USER' };

describe('OnboardingService', () => {
  let service: OnboardingService;
  const prismaMock = {
    user: { findUnique: jest.fn() },
    checklistItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [OnboardingService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(OnboardingService);
  });

  describe('findAll', () => {
    const item = { id: 'i1', userId: 'u1', tipo: 'ADMISSAO', categoria: 'Documentação', titulo: 'x', observacaoInterna: 'segredo' };

    it('mantém observacaoInterna para ADMIN', async () => {
      prismaMock.checklistItem.findMany.mockResolvedValue([item]);
      const resultado = await service.findAll('u1', ADMIN);
      expect(resultado[0].observacaoInterna).toBe('segredo');
    });

    it('remove observacaoInterna para o próprio colaborador', async () => {
      prismaMock.checklistItem.findMany.mockResolvedValue([item]);
      const resultado = await service.findAll('u1', USER);
      expect(resultado[0].observacaoInterna).toBeUndefined();
    });

    it('permite GESTOR ler o checklist do liderado direto, sem observacaoInterna', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ gestorId: 'gestor1' });
      prismaMock.checklistItem.findMany.mockResolvedValue([item]);
      const resultado = await service.findAll('u1', GESTOR);
      expect(resultado[0].observacaoInterna).toBeUndefined();
    });

    it('nega GESTOR que não é gestor direto do alvo', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ gestorId: 'outro-gestor' });
      await expect(service.findAll('u1', GESTOR)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('filtra por tipo quando informado', async () => {
      prismaMock.checklistItem.findMany.mockResolvedValue([]);
      await service.findAll('u1', ADMIN, TipoChecklist.DESLIGAMENTO);
      expect(prismaMock.checklistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', tipo: TipoChecklist.DESLIGAMENTO } }),
      );
    });
  });

  describe('gerarPadrao', () => {
    it('gera os itens de admissão por padrão', async () => {
      await service.gerarPadrao('u1');
      const dados = prismaMock.checklistItem.createMany.mock.calls[0][0].data;
      expect(dados.length).toBeGreaterThan(0);
      expect(dados.every((item: any) => item.tipo === TipoChecklist.ADMISSAO)).toBe(true);
    });

    it('gera os itens de desligamento quando pedido', async () => {
      await service.gerarPadrao('u1', TipoChecklist.DESLIGAMENTO);
      const dados = prismaMock.checklistItem.createMany.mock.calls[0][0].data;
      expect(dados.map((item: any) => item.titulo)).toContain('Devolução de patrimônio');
      expect(dados.every((item: any) => item.tipo === TipoChecklist.DESLIGAMENTO)).toBe(true);
    });
  });
});
