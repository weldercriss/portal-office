import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.service';

/**
 * Broadcast simples (sem sala por usuário): qualquer admin olhando a tela de
 * Agendamentos precisa saber que um horário acabou de ser tomado por outra
 * pessoa, não só o solicitante da reserva — por isso não reaproveita o
 * `NotificacoesGateway`, que é por usuário. A garantia real contra
 * dupla-reserva continua sendo a checagem de conflito em
 * `ReservasService.validarHorario`; isto aqui é só para a tela não mentir
 * enquanto o admin decide.
 */
@WebSocketGateway({
  namespace: '/agendamento',
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true },
})
export class AgendamentoGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      await this.jwt.verifyAsync<JwtPayload>(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      client.disconnect();
    }
  }

  /** Qualquer criação, edição, confirmação ou cancelamento de reserva. */
  avisarMudancaDeReserva() {
    this.server.emit('reserva:mudou');
  }

  private extractToken(client: Socket): string | null {
    const doHandshake = client.handshake.auth?.token as string | undefined;
    if (doHandshake) return doHandshake;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
