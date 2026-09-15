import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/notificacoes',
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true },
})
export class NotificacoesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (!await this.podeAcessar(payload.sub)) {
        client.disconnect();
        return;
      }
      client.data.userId = payload.sub;
      await client.join(this.roomDoUsuario(payload.sub));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  async emitParaUsuario(userId: string, notificacao: unknown) {
    if (!await this.podeAcessar(userId)) {
      this.server.in(this.roomDoUsuario(userId)).disconnectSockets(true);
      return;
    }
    this.server.to(this.roomDoUsuario(userId)).emit('notificacao:nova', notificacao);
  }

  private async podeAcessar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ativo: true, acessoPlataforma: true },
    });
    return user?.ativo && user.acessoPlataforma;
  }

  private roomDoUsuario(userId: string) {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string | null {
    const doHandshake = client.handshake.auth?.token as string | undefined;
    if (doHandshake) return doHandshake;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
