import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservaStatus } from '@prisma/client';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { fuso, instanteWallClock } from './reserva-instante.util';
import { textoGrupoReserva } from './reserva-telegram.util';
import { destinatariosReserva, DestinatariosReserva } from './reserva-destinatarios.util';

/** Janela de disparo do lembrete: entre 25 e 35 minutos antes do início. */
const JANELA_MIN_MS = 25 * 60_000;
const JANELA_MAX_MS = 35 * 60_000;

/** Dia (YYYY-MM-DD) de uma coluna `data`, que é sempre meia-noite UTC. */
function dia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Avisa os destinatários escolhidos 30 minutos antes do início e do fim da
 * reserva. Roda a cada 5 minutos e busca só o dia de hoje: uma reserva não passa
 * 24h em aberto sem já ter sido confirmada ou cancelada, então a janela de busca
 * não precisa olhar mais longe que isso.
 */
@Injectable()
export class ReservaLembreteWorker {
  private readonly logger = new Logger(ReservaLembreteWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async avisarProximas(): Promise<void> {
    const agora = new Date();
    const hoje = dia(agora);

    const candidatas = await this.prisma.reserva.findMany({
      where: {
        status: ReservaStatus.CONFIRMADA,
        notificarTelegram: true,
        data: new Date(`${hoje}T00:00:00.000Z`),
        OR: [{ lembrete30MinEnviado: false }, { lembreteFim30MinEnviado: false }],
      },
      include: {
        sala: { select: { nome: true } },
        solicitante: { select: { id: true, nome: true, telegramUsername: true } },
        responsavel: { select: { id: true, nome: true, telegramUsername: true } },
      },
    });
    if (candidatas.length === 0) return;

    const timeZone = fuso();
    for (const reserva of candidatas) {
      const inicio = instanteWallClock(hoje, reserva.horaInicio, timeZone);
      const fim = instanteWallClock(hoje, reserva.horaFim, timeZone);

      if (!reserva.lembrete30MinEnviado) {
        const faltamInicio = inicio.getTime() - agora.getTime();
        if (faltamInicio >= JANELA_MIN_MS && faltamInicio <= JANELA_MAX_MS) {
          await this.avisar(reserva, 'RESERVA_SALA_LEMBRETE', 'Sua reserva começa em 30 minutos', 'lembrete30MinEnviado');
        }
      }

      if (!reserva.lembreteFim30MinEnviado) {
        const faltamFim = fim.getTime() - agora.getTime();
        if (faltamFim >= JANELA_MIN_MS && faltamFim <= JANELA_MAX_MS) {
          await this.avisar(
            reserva,
            'RESERVA_SALA_LEMBRETE_FIM',
            'Sua reserva termina em 30 minutos',
            'lembreteFim30MinEnviado',
          );
        }
      }
    }
  }

  private async avisar(
    reserva: DestinatariosReserva & {
      id: string;
      data: Date;
      horaInicio: string;
      horaFim: string;
      titulo: string | null;
      sala: { nome: string };
      solicitante: { id: string; nome: string; telegramUsername: string | null };
      responsavel: { id: string; nome: string; telegramUsername: string | null } | null;
    },
    tipo: string,
    titulo: string,
    flag: 'lembrete30MinEnviado' | 'lembreteFim30MinEnviado',
  ) {
    try {
      for (const [index, userId] of destinatariosReserva(reserva).entries()) {
        await this.notificacoesService.criar({
          userId,
          tipo,
          titulo,
          mensagem: `${reserva.sala.nome}, ${reserva.horaInicio} às ${reserva.horaFim}`,
          link: '/agendamentos',
          telegramGrupoTexto: index === 0 ? textoGrupoReserva(reserva, tipo, titulo) : undefined,
        });
      }
      if (flag === 'lembrete30MinEnviado') {
        await this.prisma.reserva.update({ where: { id: reserva.id }, data: { lembrete30MinEnviado: true } });
      } else {
        await this.prisma.reserva.update({ where: { id: reserva.id }, data: { lembreteFim30MinEnviado: true } });
      }
    } catch (erro) {
      this.logger.warn(`Falha ao avisar lembrete da reserva ${reserva.id}: ${(erro as Error).message}`);
    }
  }
}
