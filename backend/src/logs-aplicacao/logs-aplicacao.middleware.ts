import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { LogsAplicacaoService } from './logs-aplicacao.service';
import type { LogAplicacaoContexto, RequestComLogAplicacao } from './logs-aplicacao.types';

interface UsuarioAutenticado {
  id: string;
}

const ROTA_PROPRIA = '/logs-aplicacao';

function deveIgnorar(req: RequestComLogAplicacao): boolean {
  if (req.method === 'OPTIONS') return true;
  return req.method === 'GET' && (req.path === ROTA_PROPRIA || req.path.startsWith(`${ROTA_PROPRIA}/`));
}

/** Só é possível ler o template real depois que o Express roteou a requisição (guards/pipes já rodaram). */
function obterRotaTemplate(req: RequestComLogAplicacao): string {
  const template = `${req.baseUrl ?? ''}${req.route?.path ?? ''}`;
  return template || 'rota não reconhecida';
}

/**
 * Gera o requestId e o contexto de cada requisição elegível, e envia o
 * resumo final ao service quando a resposta termina (ou a conexão é
 * abortada) — sem bloquear nem alterar a resposta entregue ao usuário.
 */
@Injectable()
export class LogsAplicacaoMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LogsAplicacaoMiddleware.name);

  constructor(private readonly service: LogsAplicacaoService) {}

  use(req: RequestComLogAplicacao, res: Response, next: NextFunction): void {
    if (deveIgnorar(req)) {
      next();
      return;
    }

    const requestId = randomUUID();
    const contexto: LogAplicacaoContexto = {
      requestId,
      metodo: req.method,
      iniciadoEm: new Date(),
      inicioMonotonico: process.hrtime.bigint(),
      ipOrigem: req.ip,
      userAgent: req.get('user-agent'),
    };
    req.logAplicacaoContexto = contexto;
    res.setHeader('X-Request-Id', requestId);

    let finalizado = false;
    const finalizar = (abortada: boolean) => {
      if (finalizado) return;
      finalizado = true;

      const duracaoMs = Number(process.hrtime.bigint() - contexto.inicioMonotonico) / 1_000_000;
      const usuario = req.user as UsuarioAutenticado | undefined;

      this.service
        .registrar({
          requestId,
          metodo: contexto.metodo,
          rota: obterRotaTemplate(req),
          statusHttp: abortada ? 499 : res.statusCode,
          duracaoMs: Math.round(duracaoMs),
          iniciadoEm: contexto.iniciadoEm,
          finalizadoEm: new Date(),
          abortada,
          usuarioId: usuario?.id,
          ipOrigem: contexto.ipOrigem,
          userAgent: contexto.userAgent,
          erro: contexto.erro,
        })
        .catch((erro: unknown) => {
          this.logger.error(
            `Falha ao registrar log de aplicação (requestId=${requestId})`,
            erro instanceof Error ? erro.stack : String(erro),
          );
        });
    };

    res.on('finish', () => finalizar(false));
    res.on('close', () => finalizar(!res.writableEnded));

    next();
  }
}
