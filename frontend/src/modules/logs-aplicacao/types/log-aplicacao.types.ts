export type LogAplicacaoResultado = 'SUCESSO' | 'ERRO_CLIENTE' | 'ERRO_SERVIDOR' | 'ABORTADA';

export const RESULTADO_LOG_APLICACAO: { value: LogAplicacaoResultado; label: string }[] = [
  { value: 'SUCESSO', label: 'Sucesso' },
  { value: 'ERRO_CLIENTE', label: 'Erro do cliente' },
  { value: 'ERRO_SERVIDOR', label: 'Erro do servidor' },
  { value: 'ABORTADA', label: 'Abortada' },
];

export interface LogAplicacaoResumo {
  id: string;
  requestId: string;
  ciclo: number;
  sequencia: number;
  resultado: LogAplicacaoResultado;
  metodo: string;
  rota: string;
  statusHttp: number;
  duracaoMs: number;
  finalizadoEm: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  usuarioEmail: string | null;
}

export interface LogAplicacaoDetalhe extends LogAplicacaoResumo {
  iniciadoEm: string;
  ipOrigem: string | null;
  userAgent: string | null;
  erroClasse: string | null;
  erroMensagem: string | null;
  erroStack: string | null;
  erroDetalhes: string | null;
}

export interface LogsAplicacaoResposta {
  ciclo: number;
  quantidade: number;
  limite: number;
  logs: LogAplicacaoResumo[];
}

export interface FiltrosLogAplicacao {
  resultado?: LogAplicacaoResultado;
  metodo?: string;
  statusHttp?: number;
  usuarioId?: string;
  busca?: string;
}
