import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { classificarErro } from './logs-aplicacao.sanitizer';
import type { RequestComLogAplicacao } from './logs-aplicacao.types';

/**
 * Enriquece o contexto criado pelo middleware com os dados sanitizados da
 * exceção e delega ao tratamento padrão do NestJS — status e corpo da
 * resposta continuam exatamente os que controllers/guards/ValidationPipe já
 * produzem hoje. Quem persiste o log é sempre o middleware, no `finish`;
 * este filter só anota o erro no contexto antes disso acontecer.
 */
@Catch()
export class LogsAplicacaoExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<RequestComLogAplicacao>();
      if (req.logAplicacaoContexto) {
        req.logAplicacaoContexto.erro = classificarErro(exception);
      }
    }
    super.catch(exception, host);
  }
}
