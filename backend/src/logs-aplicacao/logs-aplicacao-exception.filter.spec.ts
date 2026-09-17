import { NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { LogsAplicacaoExceptionFilter } from './logs-aplicacao-exception.filter';
import type { RequestComLogAplicacao } from './logs-aplicacao.types';

function criarHost(req: RequestComLogAplicacao, tipo: 'http' | 'rpc' = 'http') {
  return {
    getType: () => tipo,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}), getNext: () => undefined }),
  } as never;
}

describe('LogsAplicacaoExceptionFilter', () => {
  let filter: LogsAplicacaoExceptionFilter;
  let superCatch: jest.SpyInstance;

  beforeEach(() => {
    filter = new LogsAplicacaoExceptionFilter();
    // O tratamento padrão do NestJS (status/corpo da resposta) não muda com este filter —
    // só validamos que ele é sempre chamado, sem reimplementar o que o BaseExceptionFilter já faz.
    superCatch = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
  });

  afterEach(() => {
    superCatch.mockRestore();
  });

  it('anota o contexto do middleware com o erro sanitizado e delega ao tratamento padrão', () => {
    const req = { logAplicacaoContexto: { requestId: 'req-1' } } as unknown as RequestComLogAplicacao;
    const exception = new NotFoundException('Colaborador não encontrado');

    filter.catch(exception, criarHost(req));

    expect(req.logAplicacaoContexto?.erro).toEqual({ classe: 'NotFoundException', mensagem: 'Colaborador não encontrado' });
    expect(superCatch).toHaveBeenCalledWith(exception, expect.anything());
  });

  it('não falha quando a requisição não tem contexto (rota excluída da captura)', () => {
    const req = {} as unknown as RequestComLogAplicacao;
    const exception = new Error('sem contexto');

    expect(() => filter.catch(exception, criarHost(req))).not.toThrow();
    expect(superCatch).toHaveBeenCalled();
  });

  it('ignora contextos que não são HTTP (ex.: RPC) sem tentar ler a requisição', () => {
    const host = {
      getType: () => 'rpc',
      switchToHttp: () => {
        throw new Error('não deveria ser chamado para contexto não-HTTP');
      },
    } as never;

    expect(() => filter.catch(new Error('erro'), host)).not.toThrow();
    expect(superCatch).toHaveBeenCalled();
  });
});
