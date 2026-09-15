import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FalhaSincronizacao, ReservasAgendaService } from './reservas-agenda.service';

const LOTE = 25;
const MAX_TENTATIVAS = 10;

/** Espera crescente até uma hora, para não insistir contra a cota do Google. */
function minutosDeEspera(tentativas: number): number {
  return Math.min(60, 2 ** tentativas);
}

function resumir(falhas: FalhaSincronizacao[]): string {
  return falhas
    .map((falha) => `${falha.userId}: ${falha.mensagem}`)
    .join(' | ')
    .slice(0, 500);
}

/**
 * Processa a outbox das reservas. Roda em uma instância só, que é como o portal
 * é publicado hoje; com mais réplicas seria preciso travar o lote.
 */
@Injectable()
export class ReservasAgendaWorker {
  private readonly logger = new Logger(ReservasAgendaWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: ReservasAgendaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processarPendencias(): Promise<void> {
    if (!this.agenda.habilitado) return;

    const pendentes = await this.prisma.reservaSyncPendente.findMany({
      where: {
        proximaTentativa: { lte: new Date() },
        tentativas: { lt: MAX_TENTATIVAS },
        aguardandoReconexaoUserId: null,
      },
      orderBy: { proximaTentativa: 'asc' },
      take: LOTE,
    });

    for (const pendente of pendentes) {
      try {
        const { falhas } = await this.agenda.sincronizar(pendente.reservaId);

        if (falhas.length === 0) {
          await this.prisma.reservaSyncPendente.delete({ where: { id: pendente.id } });
          continue;
        }

        // Só falta autorização: insistir não resolve. A pendência espera a
        // reconexão em vez de queimar tentativas e ser dada como concluída.
        const semAutorizacao = falhas.filter((falha) => falha.motivo === 'RECONEXAO');
        if (semAutorizacao.length === falhas.length) {
          await this.prisma.reservaSyncPendente.update({
            where: { id: pendente.id },
            data: { aguardandoReconexaoUserId: semAutorizacao[0]!.userId, ultimoErro: resumir(falhas) },
          });
          this.logger.warn(`Reserva ${pendente.reservaId} aguarda reconexão na agenda: ${resumir(falhas)}`);
          continue;
        }

        await this.adiar(pendente, resumir(falhas));
      } catch (erro) {
        await this.adiar(pendente, erro instanceof Error ? erro.message : String(erro));
      }
    }
  }

  private async adiar(pendente: { id: string; reservaId: string; tentativas: number }, mensagem: string) {
    const tentativas = pendente.tentativas + 1;
    await this.prisma.reservaSyncPendente.update({
      where: { id: pendente.id },
      data: {
        tentativas,
        ultimoErro: mensagem.slice(0, 500),
        proximaTentativa: new Date(Date.now() + minutosDeEspera(tentativas) * 60_000),
      },
    });
    const aviso =
      tentativas >= MAX_TENTATIVAS
        ? `Reserva ${pendente.reservaId} desistiu após ${tentativas} tentativas na agenda`
        : `Reserva ${pendente.reservaId} falhou na agenda (tentativa ${tentativas})`;
    this.logger.warn(`${aviso}: ${mensagem}`);
  }
}
