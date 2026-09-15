import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaGoogleService, FalhaSincronizacao } from './agenda-google.service';

const LOTE = 25;
const MAX_TENTATIVAS = 10;

/** Espera crescente até uma hora, para não insistir contra a cota do Google. */
function minutosDeEspera(tentativas: number): number {
  return Math.min(60, 2 ** tentativas);
}

function resumir(falhas: FalhaSincronizacao[]): string {
  return falhas.map((falha) => `${falha.userId}: ${falha.mensagem}`).join(' | ').slice(0, 500);
}

/**
 * Processa a outbox da agenda. Roda em uma instância só, que é como o portal é
 * publicado hoje; com mais réplicas seria preciso travar o lote.
 */
@Injectable()
export class AgendaGoogleWorker {
  private readonly logger = new Logger(AgendaGoogleWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: AgendaGoogleService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processarPendencias(): Promise<void> {
    if (!this.agenda.habilitado) return;

    const pendentes = await this.prisma.agendaSyncPendente.findMany({
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
        const { falhas } = await this.agenda.sincronizar(pendente.plantaoId);

        if (falhas.length === 0) {
          await this.prisma.agendaSyncPendente.delete({ where: { id: pendente.id } });
          continue;
        }

        // Só falta autorização: insistir não resolve. A pendência espera a
        // reconexão em vez de queimar tentativas e ser dada como concluída.
        const semAutorizacao = falhas.filter((falha) => falha.motivo === 'RECONEXAO');
        if (semAutorizacao.length === falhas.length) {
          await this.prisma.agendaSyncPendente.update({
            where: { id: pendente.id },
            data: { aguardandoReconexaoUserId: semAutorizacao[0]!.userId, ultimoErro: resumir(falhas) },
          });
          this.logger.warn(`Plantão ${pendente.plantaoId} aguarda reconexão na agenda: ${resumir(falhas)}`);
          continue;
        }

        await this.adiar(pendente, resumir(falhas));
      } catch (erro) {
        await this.adiar(pendente, erro instanceof Error ? erro.message : String(erro));
      }
    }
  }

  private async adiar(pendente: { id: string; plantaoId: string; tentativas: number }, mensagem: string) {
    const tentativas = pendente.tentativas + 1;
    await this.prisma.agendaSyncPendente.update({
      where: { id: pendente.id },
      data: {
        tentativas,
        ultimoErro: mensagem.slice(0, 500),
        proximaTentativa: new Date(Date.now() + minutosDeEspera(tentativas) * 60_000),
      },
    });
    const aviso =
      tentativas >= MAX_TENTATIVAS
        ? `Plantão ${pendente.plantaoId} desistiu após ${tentativas} tentativas na agenda`
        : `Plantão ${pendente.plantaoId} falhou na agenda (tentativa ${tentativas})`;
    this.logger.warn(`${aviso}: ${mensagem}`);
  }
}
