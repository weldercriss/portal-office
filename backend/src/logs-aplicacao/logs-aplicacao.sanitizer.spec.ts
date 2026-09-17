import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LogAplicacaoResultado } from '@prisma/client';
import { classificarErro, classificarResultado, sanitizarSegredos, truncar } from './logs-aplicacao.sanitizer';

describe('logs-aplicacao.sanitizer', () => {
  describe('classificarResultado', () => {
    it.each([
      [199, false, LogAplicacaoResultado.SUCESSO],
      [204, false, LogAplicacaoResultado.SUCESSO],
      [399, false, LogAplicacaoResultado.SUCESSO],
      [400, false, LogAplicacaoResultado.ERRO_CLIENTE],
      [404, false, LogAplicacaoResultado.ERRO_CLIENTE],
      [499, false, LogAplicacaoResultado.ERRO_CLIENTE],
      [500, false, LogAplicacaoResultado.ERRO_SERVIDOR],
      [503, false, LogAplicacaoResultado.ERRO_SERVIDOR],
    ])('classifica status %i como %s', (status, abortada, esperado) => {
      expect(classificarResultado(status, abortada)).toBe(esperado);
    });

    it('classifica como ABORTADA independentemente do status quando a conexão foi encerrada antes do finish', () => {
      expect(classificarResultado(200, true)).toBe(LogAplicacaoResultado.ABORTADA);
    });
  });

  describe('sanitizarSegredos', () => {
    it('remove um bearer token', () => {
      expect(sanitizarSegredos('Authorization header: Bearer abc123.def456-ghi')).not.toContain('abc123');
    });

    it('remove senha/token/segredo em pares chave=valor', () => {
      expect(sanitizarSegredos('payload: { senha: "12345", token=xyz }')).not.toMatch(/12345|xyz/);
    });

    it('remove cookie', () => {
      expect(sanitizarSegredos('Cookie: refreshToken=abc; outro=1')).not.toContain('abc');
    });

    it('preserva texto sem segredo', () => {
      expect(sanitizarSegredos('Usuário não encontrado')).toBe('Usuário não encontrado');
    });

    it('retorna undefined para texto vazio', () => {
      expect(sanitizarSegredos(undefined)).toBeUndefined();
      expect(sanitizarSegredos(null)).toBeUndefined();
      expect(sanitizarSegredos('')).toBeUndefined();
    });
  });

  describe('truncar', () => {
    it('não altera texto dentro do limite', () => {
      expect(truncar('abc', 10)).toBe('abc');
    });

    it('corta e marca texto acima do limite', () => {
      expect(truncar('a'.repeat(20), 5)).toBe('aaaaa…');
    });

    it('retorna undefined para texto vazio', () => {
      expect(truncar(undefined, 5)).toBeUndefined();
    });
  });

  describe('classificarErro', () => {
    it('extrai classe e mensagem de uma HttpException simples', () => {
      const erro = classificarErro(new NotFoundException('Colaborador não encontrado'));
      expect(erro).toEqual({ classe: 'NotFoundException', mensagem: 'Colaborador não encontrado' });
    });

    it('junta as mensagens de validação de um BadRequestException do ValidationPipe', () => {
      const erro = classificarErro(new BadRequestException(['campo obrigatório', 'formato inválido']));
      expect(erro.classe).toBe('BadRequestException');
      expect(erro.mensagem).toBe('campo obrigatório; formato inválido');
    });

    it('sanitiza segredo dentro da mensagem de uma HttpException', () => {
      const erro = classificarErro(new BadRequestException('token=abc123 inválido'));
      expect(erro.mensagem).not.toContain('abc123');
    });

    it('extrai classe, mensagem e stack sanitizado de um Error genérico', () => {
      const original = new Error('Falha ao conectar: senha=segredo123');
      const erro = classificarErro(original);
      expect(erro.classe).toBe('Error');
      expect(erro.mensagem).not.toContain('segredo123');
      expect(erro.stack).toBeDefined();
      expect(erro.stack).not.toContain('segredo123');
    });

    it('nunca serializa o objeto inteiro de um erro desconhecido', () => {
      const erro = classificarErro({ codigoInterno: 'P2002', algumaCoisaSensivel: 'nao deveria vazar' });
      expect(erro).toEqual({ classe: 'DesconhecidoErro', mensagem: 'Erro não identificado' });
    });
  });
});
