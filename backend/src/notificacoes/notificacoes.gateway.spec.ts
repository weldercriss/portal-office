import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesGateway } from './notificacoes.gateway';

describe('NotificacoesGateway platform access', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: '1' }) };
  const room = { emit: jest.fn(), disconnectSockets: jest.fn() };
  let gateway: NotificacoesGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new NotificacoesGateway(jwt as unknown as JwtService, prisma as unknown as PrismaService);
    gateway.server = { to: jest.fn().mockReturnValue(room), in: jest.fn().mockReturnValue(room) } as any;
  });

  it.each([true, false])('checks platform access before joining notifications (access: %s)', async (acessoPlataforma) => {
    prisma.user.findUnique.mockResolvedValue({ ativo: true, acessoPlataforma });
    const client = {
      handshake: { auth: { token: 'existing-token' } }, data: {}, join: jest.fn(), disconnect: jest.fn(),
    };
    await gateway.handleConnection(client as unknown as Socket);
    if (acessoPlataforma) {
      expect(client.join).toHaveBeenCalledWith('user:1');
      expect(client.disconnect).not.toHaveBeenCalled();
    } else {
      expect(client.join).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
    }
  });

  it('disconnects existing sockets without delivering notifications after access is revoked', async () => {
    prisma.user.findUnique.mockResolvedValue({ ativo: true, acessoPlataforma: false });
    await gateway.emitParaUsuario('1', { titulo: 'Aviso' });
    expect(room.emit).not.toHaveBeenCalled();
    expect(room.disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('delivers notifications to users with access', async () => {
    prisma.user.findUnique.mockResolvedValue({ ativo: true, acessoPlataforma: true });
    await gateway.emitParaUsuario('1', { titulo: 'Aviso' });
    expect(room.emit).toHaveBeenCalledWith('notificacao:nova', { titulo: 'Aviso' });
  });
});
