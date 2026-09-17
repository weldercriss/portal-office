import { HttpException } from '@nestjs/common';
import { LogAplicacaoResultado, Prisma } from '@prisma/client';
import type { LogAplicacaoErro } from './logs-aplicacao.types';

/** Limites de tamanho por campo, aplicados na persistência (ver service). */
export const LIMITES_LOG_APLICACAO = {
  userAgent: 300,
  mensagem: 500,
  stack: 4000,
  detalhes: 500,
} as const;

export function classificarResultado(statusHttp: number, abortada: boolean): LogAplicacaoResultado {
  if (abortada) return LogAplicacaoResultado.ABORTADA;
  if (statusHttp >= 500) return LogAplicacaoResultado.ERRO_SERVIDOR;
  if (statusHttp >= 400) return LogAplicacaoResultado.ERRO_CLIENTE;
  return LogAplicacaoResultado.SUCESSO;
}

const PADROES_SEGREDO: Array<[RegExp, string]> = [
  [/bearer\s+[a-z0-9._-]+/gi, 'bearer [removido]'],
  [
    /(senha|password|token|secret|segredo|refresh[_-]?token|access[_-]?token|api[_-]?key)\s*[:=]\s*("[^"]*"|'[^']*'|\S+)/gi,
    '$1=[removido]',
  ],
  [/cookie\s*:\s*[^\n;]+/gi, 'cookie: [removido]'],
];

/** Remove padrões reconhecidos de bearer token, cookie, senha e segredo de um texto livre. */
export function sanitizarSegredos(texto: string | undefined | null): string | undefined {
  if (!texto) return undefined;
  return PADROES_SEGREDO.reduce((atual, [regex, substituicao]) => atual.replace(regex, substituicao), texto);
}

export function truncar(texto: string | undefined | null, max: number): string | undefined {
  if (!texto) return undefined;
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

function extrairMensagemResposta(resposta: unknown): string | undefined {
  if (!resposta || typeof resposta !== 'object' || !('message' in resposta)) return undefined;
  const mensagem = (resposta as { message: unknown }).message;
  if (Array.isArray(mensagem)) return mensagem.join('; ');
  if (typeof mensagem === 'string') return mensagem;
  return undefined;
}

/**
 * Extrai classe/mensagem/stack/detalhes sanitizados de uma exceção qualquer,
 * sem nunca serializar o objeto de erro inteiro (Prisma/integrações externas
 * só entram com um código técnico permitido).
 */
export function classificarErro(exception: unknown): LogAplicacaoErro {
  if (exception instanceof HttpException) {
    const resposta = exception.getResponse();
    const mensagem = (typeof resposta === 'string' ? resposta : extrairMensagemResposta(resposta)) ?? exception.message;
    return { classe: exception.name, mensagem: sanitizarSegredos(mensagem) ?? exception.name };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      classe: 'PrismaClientKnownRequestError',
      mensagem: `Erro de banco de dados (código ${exception.code})`,
      detalhes: exception.code,
    };
  }
  if (exception instanceof Error) {
    return {
      classe: exception.name,
      mensagem: sanitizarSegredos(exception.message) ?? exception.name,
      stack: sanitizarSegredos(exception.stack ?? undefined),
    };
  }
  return { classe: 'DesconhecidoErro', mensagem: 'Erro não identificado' };
}
