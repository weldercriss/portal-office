import type { Request } from 'express';

export interface LogAplicacaoErro {
  classe: string;
  mensagem: string;
  stack?: string;
  detalhes?: string;
}

/** Preenchido pelo middleware, lido/completado pelo filter e pelo próprio middleware ao finalizar. */
export interface LogAplicacaoContexto {
  requestId: string;
  metodo: string;
  iniciadoEm: Date;
  inicioMonotonico: bigint;
  ipOrigem?: string;
  userAgent?: string;
  erro?: LogAplicacaoErro;
}

export interface RequestComLogAplicacao extends Request {
  logAplicacaoContexto?: LogAplicacaoContexto;
}
