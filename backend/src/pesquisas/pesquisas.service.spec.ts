import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PesquisasService } from './pesquisas.service';

describe('PesquisasService', () => {
  const txMock = {
    pesquisa: { create: jest.fn() },
    pesquisaConvite: { createMany: jest.fn() },
  };
  const prismaMock = {
    user: { findMany: jest.fn() },
    pesquisa: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    pesquisaConvite: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
    pesquisaResposta: { findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const notificacoesMock = { criar: jest.fn() };

  const PESQUISA = {
    id: 'p1',
    titulo: 'NPS Setembro',
    descricao: null,
    tipo: 'NPS' as const,
    ativa: true,
    campos: [
      { id: 'nota', label: 'Nota de 0 a 10', tipo: 'NUMERO', obrigatorio: true },
      { id: 'comentario', label: 'Comentário', tipo: 'TEXTO' },
      { id: 'time', label: 'Time', tipo: 'SELECAO', opcoes: ['Suporte', 'Vendas'] },
    ],
    criadoPorId: 'admin1',
    criadoEm: new Date(),
  };

  let service: PesquisasService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') return arg(txMock);
      return Promise.all(arg as Promise<unknown>[]);
    });
    prismaMock.pesquisa.findUnique.mockResolvedValue(PESQUISA);
    txMock.pesquisa.create.mockResolvedValue(PESQUISA);
    service = new PesquisasService(prismaMock as never, notificacoesMock as never);
  });

  describe('create', () => {
    const dtoBase = {
      titulo: 'NPS Setembro',
      tipo: 'NPS' as const,
      campos: [{ label: 'Nota', tipo: 'NUMERO' as const, obrigatorio: true }],
    };

    it('rejeita campo do tipo ARQUIVO', async () => {
      await expect(
        service.create({ ...dtoBase, campos: [{ label: 'Anexo', tipo: 'ARQUIVO' as never }], destinatarios: { userIds: ['u1'] } }, 'admin1'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita quando nenhum destinatário é resolvido', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      await expect(service.create({ ...dtoBase, destinatarios: { userIds: ['u1'] } }, 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('cria a pesquisa e um convite por destinatário informado por userIds', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      await service.create({ ...dtoBase, destinatarios: { userIds: ['u1', 'u2', 'u1'] } }, 'admin1');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { in: ['u1', 'u2'] } }) }),
      );
      expect(txMock.pesquisaConvite.createMany).toHaveBeenCalledWith({
        data: [
          { pesquisaId: 'p1', userId: 'u1' },
          { pesquisaId: 'p1', userId: 'u2' },
        ],
      });
      expect(notificacoesMock.criar).toHaveBeenCalledTimes(2);
    });

    it('expande gestorId para os liderados diretos ativos', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'liderado1' }]);
      await service.create({ ...dtoBase, tipo: 'FEEDBACK_1_1' as never, destinatarios: { gestorId: 'gestor1' } }, 'admin1');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ gestorId: 'gestor1' }) }),
      );
      expect(txMock.pesquisaConvite.createMany).toHaveBeenCalledWith({
        data: [{ pesquisaId: 'p1', userId: 'liderado1' }],
      });
    });
  });

  describe('responder', () => {
    it('rejeita quem não foi convidado', async () => {
      prismaMock.pesquisaConvite.findUnique.mockResolvedValue(null);
      await expect(service.responder('p1', 'semconvite', { respostas: {} })).rejects.toThrow(ForbiddenException);
    });

    it('rejeita resposta duplicada', async () => {
      prismaMock.pesquisaConvite.findUnique.mockResolvedValue({ respondeuEm: new Date() });
      await expect(service.responder('p1', 'u1', { respostas: {} })).rejects.toThrow(BadRequestException);
    });

    it('grava a resposta sem userId e marca o convite, na mesma transação', async () => {
      prismaMock.pesquisaConvite.findUnique.mockResolvedValue({ respondeuEm: null });
      await service.responder('p1', 'u1', { respostas: { nota: 9 } });

      expect(prismaMock.pesquisaResposta.create).toHaveBeenCalledWith({
        data: { pesquisaId: 'p1', respostas: { nota: 9 } },
      });
      const dadosGravados = prismaMock.pesquisaResposta.create.mock.calls[0][0].data;
      expect(dadosGravados).not.toHaveProperty('userId');
      expect(prismaMock.pesquisaConvite.update).toHaveBeenCalledWith({
        where: { pesquisaId_userId: { pesquisaId: 'p1', userId: 'u1' } },
        data: { respondeuEm: expect.any(Date) },
      });
    });

    it('exige o campo obrigatório', async () => {
      prismaMock.pesquisaConvite.findUnique.mockResolvedValue({ respondeuEm: null });
      await expect(service.responder('p1', 'u1', { respostas: {} })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remover', () => {
    it('exclui a pesquisa', async () => {
      await service.remover('p1');
      expect(prismaMock.pesquisa.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('rejeita pesquisa inexistente', async () => {
      prismaMock.pesquisa.findUnique.mockResolvedValue(null);
      await expect(service.remover('inexistente')).rejects.toThrow(NotFoundException);
      expect(prismaMock.pesquisa.delete).not.toHaveBeenCalled();
    });
  });

  describe('resultado', () => {
    it('agrega contagem por opção, média numérica e lista de textos', async () => {
      prismaMock.pesquisaConvite.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
      prismaMock.pesquisaResposta.findMany.mockResolvedValue([
        { respostas: { nota: 8, comentario: 'Ótimo', time: 'Suporte' } },
        { respostas: { nota: 10, comentario: 'Muito bom', time: 'Suporte' } },
      ]);

      const resultado = await service.resultado('p1');

      expect(resultado.totalConvites).toBe(4);
      expect(resultado.totalRespondidas).toBe(2);
      expect(resultado.percentualRespondido).toBe(50);
      expect(resultado.agregados).toEqual([
        { campoId: 'nota', label: 'Nota de 0 a 10', tipo: 'NUMERO', media: 9, valores: [8, 10] },
        { campoId: 'comentario', label: 'Comentário', tipo: 'TEXTO', valores: ['Ótimo', 'Muito bom'] },
        {
          campoId: 'time',
          label: 'Time',
          tipo: 'SELECAO',
          contagemOpcoes: [
            { opcao: 'Suporte', total: 2 },
            { opcao: 'Vendas', total: 0 },
          ],
        },
      ]);
    });
  });
});
