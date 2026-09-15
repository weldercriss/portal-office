import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesGateway } from './notificacoes.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

describe('NotificacoesService', () => {
  let service: NotificacoesService;
  const prismaMock = {
    notificacao: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const gatewayMock = { emitParaUsuario: jest.fn() };
  const telegramMock = { enviar: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificacoesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesGateway, useValue: gatewayMock },
        { provide: TelegramService, useValue: telegramMock },
      ],
    }).compile();
    service = moduleRef.get(NotificacoesService);
  });

  it('creates a notification and emits it via websocket to the target user', async () => {
    prismaMock.notificacao.create.mockResolvedValue({ id: '1', userId: 'u1' });
    await service.criar({ userId: 'u1', tipo: 'X', titulo: 'T', mensagem: 'M' });
    expect(gatewayMock.emitParaUsuario).toHaveBeenCalledWith('u1', { id: '1', userId: 'u1' });
  });

  it('fans out a notification to every active admin', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    prismaMock.notificacao.create.mockImplementation(({ data }: any) => Promise.resolve({ id: data.userId, ...data }));
    await service.criarParaAdmins({ tipo: 'X', titulo: 'T', mensagem: 'M' });
    expect(gatewayMock.emitParaUsuario).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: 'ADMIN', ativo: true }) }));
  });

  it('rejects marking as read a notification owned by another user', async () => {
    prismaMock.notificacao.findUnique.mockResolvedValue({ id: '1', userId: 'other' });
    await expect(service.marcarComoLida('1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks a notification as read for its owner', async () => {
    prismaMock.notificacao.findUnique.mockResolvedValue({ id: '1', userId: 'u1' });
    prismaMock.notificacao.update.mockResolvedValue({ id: '1', userId: 'u1', lida: true });
    await service.marcarComoLida('1', 'u1');
    expect(prismaMock.notificacao.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { lida: true } });
  });
});
