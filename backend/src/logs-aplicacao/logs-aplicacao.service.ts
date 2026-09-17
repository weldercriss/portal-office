import { Injectable, NotFoundException } from '@nestjs/common';
import { LogAplicacaoResultado, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { classificarResultado, LIMITES_LOG_APLICACAO, truncar } from './logs-aplicacao.sanitizer';
import type { LogAplicacaoErro } from './logs-aplicacao.types';

export const LIMITE_LOGS_POR_CICLO = 100;

/**
 * Chave fixa e arbitrária do advisory lock desta rotação — cobre múltiplas
 * requisições concorrentes e múltiplas réplicas da API. Nunca construir essa
 * chave a partir de entrada externa.
 */
const LOG_APLICACAO_LOCK_KEY = 918_273_645n;

const LOG_APLICACAO_RESUMO_SELECT = {
  id: true,
  requestId: true,
  ciclo: true,
  sequencia: true,
  resultado: true,
  metodo: true,
  rota: true,
  statusHttp: true,
  duracaoMs: true,
  finalizadoEm: true,
  usuarioId: true,
  usuarioNome: true,
  usuarioEmail: true,
} satisfies Prisma.LogAplicacaoSelect;

export interface RegistrarLogAplicacaoInput {
  requestId: string;
  metodo: string;
  rota: string;
  statusHttp: number;
  duracaoMs: number;
  iniciadoEm: Date;
  finalizadoEm: Date;
  abortada: boolean;
  usuarioId?: string;
  ipOrigem?: string;
  userAgent?: string;
  erro?: LogAplicacaoErro;
}

export interface FiltrosLogAplicacao {
  resultado?: string;
  metodo?: string;
  statusHttp?: number;
  usuarioId?: string;
  busca?: string;
}

function montarWhere(filtros: FiltrosLogAplicacao): Prisma.LogAplicacaoWhereInput {
  return {
    resultado: filtros.resultado as LogAplicacaoResultado | undefined,
    metodo: filtros.metodo,
    statusHttp: filtros.statusHttp,
    usuarioId: filtros.usuarioId,
    OR: filtros.busca
      ? [
          { rota: { contains: filtros.busca, mode: 'insensitive' } },
          { requestId: { contains: filtros.busca, mode: 'insensitive' } },
        ]
      : undefined,
  };
}

@Injectable()
export class LogsAplicacaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grava um log dentro do ciclo atual, rotacionando o lote quando ele já
   * tem 100 entradas. Roda inteira sob um advisory lock do Postgres, para
   * requisições concorrentes não ultrapassarem o limite nem apagarem o
   * ciclo errado (ver AI/... plano de logs da aplicação).
   */
  async registrar(input: RegistrarLogAplicacaoInput): Promise<void> {
    const resultado = classificarResultado(input.statusHttp, input.abortada);
    const usuario = input.usuarioId
      ? await this.prisma.user.findUnique({ where: { id: input.usuarioId }, select: { nome: true, email: true } })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOG_APLICACAO_LOCK_KEY})`;

      const controle = await tx.logAplicacaoControle.upsert({ where: { id: 1 }, create: {}, update: {} });
      let { ciclo, quantidade } = controle;
      if (quantidade >= LIMITE_LOGS_POR_CICLO) {
        await tx.logAplicacao.deleteMany({ where: { ciclo } });
        ciclo += 1;
        quantidade = 0;
      }

      await tx.logAplicacao.create({
        data: {
          requestId: input.requestId,
          ciclo,
          sequencia: quantidade + 1,
          resultado,
          metodo: input.metodo,
          rota: input.rota,
          statusHttp: input.statusHttp,
          duracaoMs: input.duracaoMs,
          iniciadoEm: input.iniciadoEm,
          finalizadoEm: input.finalizadoEm,
          usuarioId: input.usuarioId,
          usuarioNome: usuario?.nome,
          usuarioEmail: usuario?.email,
          ipOrigem: input.ipOrigem,
          userAgent: truncar(input.userAgent, LIMITES_LOG_APLICACAO.userAgent),
          erroClasse: input.erro?.classe,
          erroMensagem: truncar(input.erro?.mensagem, LIMITES_LOG_APLICACAO.mensagem),
          erroStack: truncar(input.erro?.stack, LIMITES_LOG_APLICACAO.stack),
          erroDetalhes: truncar(input.erro?.detalhes, LIMITES_LOG_APLICACAO.detalhes),
        },
      });

      await tx.logAplicacaoControle.update({ where: { id: 1 }, data: { ciclo, quantidade: quantidade + 1 } });
    });
  }

  async listar(filtros: FiltrosLogAplicacao) {
    const [controle, logs] = await Promise.all([
      this.obterControle(),
      this.prisma.logAplicacao.findMany({
        where: montarWhere(filtros),
        orderBy: [{ ciclo: 'desc' }, { sequencia: 'desc' }],
        select: LOG_APLICACAO_RESUMO_SELECT,
      }),
    ]);
    return { ciclo: controle.ciclo, quantidade: controle.quantidade, limite: LIMITE_LOGS_POR_CICLO, logs };
  }

  async obterDetalhe(id: string) {
    const log = await this.prisma.logAplicacao.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Log não encontrado');
    return log;
  }

  private async obterControle(): Promise<{ ciclo: number; quantidade: number }> {
    const controle = await this.prisma.logAplicacaoControle.findUnique({ where: { id: 1 } });
    return controle ?? { ciclo: 1, quantidade: 0 };
  }
}
