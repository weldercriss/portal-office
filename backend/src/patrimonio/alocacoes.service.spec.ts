import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlocacoesService } from './alocacoes.service';
import { EquipamentosService } from './equipamentos.service';

const ATIVO = { nome: 'Ana', ativo: true, statusColaborador: 'ATIVO' };
const DESLIGADO = { nome: 'Bruno', ativo: true, statusColaborador: 'DESLIGADO' };

/** Item em estoque e livre: o caso feliz da entrega. */
const LIVRE = {
  id: 'eq1',
  estado: 'BOM',
  status: 'ESTOQUE',
  ativo: true,
  tipo: { id: 't1', nome: 'Notebook', exigeTermo: true },
  alocacoes: [],
};

describe('AlocacoesService', () => {
  let service: AlocacoesService;

  const prismaMock: any = {
    alocacaoEquipamento: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    equipamento: { update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  prismaMock.$transaction = jest.fn((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prismaMock) : Promise.all(arg as Promise<unknown>[]),
  );

  const notificacoesMock = { criar: jest.fn(), criarParaAdmins: jest.fn() };
  const equipamentosMock = {
    findOne: jest.fn(),
    garantirEntregavel: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(ATIVO);
    equipamentosMock.findOne.mockResolvedValue(LIVRE);
    prismaMock.alocacaoEquipamento.create.mockResolvedValue({
      id: 'al1',
      colaboradorId: 'u1',
      equipamento: { tipo: { nome: 'Notebook' }, numero: 'PAT-1', marca: 'Dell' },
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AlocacoesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesService, useValue: notificacoesMock },
        { provide: EquipamentosService, useValue: equipamentosMock },
      ],
    }).compile();
    service = moduleRef.get(AlocacoesService);
  });

  describe('create', () => {
    it('entrega o item e marca o equipamento como em uso', async () => {
      await service.create(
        { equipamentoId: 'eq1', colaboradorId: 'u1', dataInicio: '2026-09-10' } as any,
        'admin1',
      );

      expect(prismaMock.equipamento.update).toHaveBeenCalledWith({
        where: { id: 'eq1' },
        data: { status: 'EM_USO' },
      });
      // Sem estado informado, o registro herda a conservação atual do item.
      expect(prismaMock.alocacaoEquipamento.create.mock.calls[0][0].data).toMatchObject({
        status: 'PENDENTE',
        estadoNaEntrega: 'BOM',
      });
    });

    it('recusa entregar a colaborador desligado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(DESLIGADO);
      await expect(
        service.create({ equipamentoId: 'eq1', colaboradorId: 'u2', dataInicio: '2026-09-10' } as any, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.alocacaoEquipamento.create).not.toHaveBeenCalled();
    });

    it('recusa entregar item que já está com outra pessoa', async () => {
      equipamentosMock.findOne.mockResolvedValue({
        ...LIVRE,
        alocacoes: [{ id: 'al0', colaborador: { nome: 'Carla' } }],
      });
      await expect(
        service.create({ equipamentoId: 'eq1', colaboradorId: 'u1', dataInicio: '2026-09-10' } as any, 'admin1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('recusa nascer devolvido', async () => {
      await expect(
        service.create(
          { equipamentoId: 'eq1', colaboradorId: 'u1', dataInicio: '2026-09-10', status: 'DEVOLVIDO' } as any,
          'admin1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('devolver', () => {
    it('encerra o registro e devolve o item ao estoque com o estado reavaliado', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        equipamentoId: 'eq1',
        colaboradorId: 'u1',
        status: 'ENTREGUE',
        termoCaminho: null,
      });
      prismaMock.alocacaoEquipamento.update.mockResolvedValue({
        id: 'al1',
        colaboradorId: 'u1',
        estadoNaDevolucao: 'RUIM',
        equipamento: { tipo: { nome: 'Notebook' }, numero: 'PAT-1', marca: 'Dell' },
      });

      await service.devolver('al1', { estadoNaDevolucao: 'RUIM' } as any);

      expect(prismaMock.equipamento.update).toHaveBeenCalledWith({
        where: { id: 'eq1' },
        data: { status: 'ESTOQUE', estado: 'RUIM' },
      });
    });

    it('recusa devolver um registro já encerrado', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        equipamentoId: 'eq1',
        status: 'DEVOLVIDO',
      });
      await expect(service.devolver('al1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('devolverTudoDoColaborador', () => {
    it('devolve ao estoque tudo que estava com quem foi desligado', async () => {
      prismaMock.alocacaoEquipamento.findMany.mockResolvedValue([
        { id: 'al1', equipamentoId: 'eq1' },
        { id: 'al2', equipamentoId: 'eq2' },
      ]);

      const resultado = await service.devolverTudoDoColaborador('u1');

      expect(resultado).toEqual({ devolvidas: 2 });
      expect(prismaMock.equipamento.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['eq1', 'eq2'] } },
        data: { status: 'ESTOQUE' },
      });
      expect(prismaMock.alocacaoEquipamento.updateMany.mock.calls[0][0].data).toMatchObject({
        status: 'DEVOLVIDO',
        motivoDevolucao: 'Desligamento do colaborador',
      });
    });

    it('não mexe em nada quando o colaborador não tem equipamento', async () => {
      prismaMock.alocacaoEquipamento.findMany.mockResolvedValue([]);
      await expect(service.devolverTudoDoColaborador('u1')).resolves.toEqual({ devolvidas: 0 });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('termo', () => {
    it('anexar o termo assinado marca o registro como assinado', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        colaboradorId: 'u1',
        status: 'ENTREGUE',
        termoCaminho: null,
      });
      prismaMock.alocacaoEquipamento.update.mockResolvedValue({ id: 'al1' });

      await service.anexarTermo(
        'al1',
        { originalname: 'termo.pdf', filename: 'abc.pdf', mimetype: 'application/pdf' } as any,
        { id: 'admin1', role: 'ADMIN' },
      );

      expect(prismaMock.alocacaoEquipamento.update.mock.calls[0][0].data).toMatchObject({
        status: 'ASSINADO',
        termoNome: 'termo.pdf',
      });
    });

    it('o próprio colaborador pode anexar o termo do seu equipamento', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        colaboradorId: 'u1',
        status: 'ENTREGUE',
        termoCaminho: null,
      });
      prismaMock.alocacaoEquipamento.update.mockResolvedValue({ id: 'al1' });

      await service.anexarTermo(
        'al1',
        { originalname: 'termo.pdf', filename: 'abc.pdf', mimetype: 'application/pdf' } as any,
        { id: 'u1', role: 'USER' },
      );

      expect(prismaMock.alocacaoEquipamento.update.mock.calls[0][0].data).toMatchObject({ status: 'ASSINADO' });
    });

    it('barra quem não é dono nem admin de anexar o termo', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        colaboradorId: 'u1',
        status: 'ENTREGUE',
        termoCaminho: null,
      });

      await expect(
        service.anexarTermo(
          'al1',
          { originalname: 'termo.pdf', filename: 'abc.pdf', mimetype: 'application/pdf' } as any,
          { id: 'outro', role: 'USER' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.alocacaoEquipamento.update).not.toHaveBeenCalled();
    });

    it('remover o termo desfaz o assinado', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        status: 'ASSINADO',
        termoCaminho: 'abc.pdf',
      });
      prismaMock.alocacaoEquipamento.update.mockResolvedValue({ id: 'al1' });

      await service.removerTermo('al1');

      expect(prismaMock.alocacaoEquipamento.update.mock.calls[0][0].data).toMatchObject({
        status: 'ENTREGUE',
        termoCaminho: null,
      });
    });

    it('não deixa marcar como assinado sem termo anexado', async () => {
      prismaMock.alocacaoEquipamento.findUnique.mockResolvedValue({
        id: 'al1',
        equipamentoId: 'eq1',
        colaboradorId: 'u1',
        status: 'ENTREGUE',
        termoCaminho: null,
      });
      await expect(service.update('al1', { status: 'ASSINADO' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('anexarTermoLote', () => {
    const arquivo = { originalname: 'termo.pdf', filename: 'abc.pdf', mimetype: 'application/pdf' } as any;

    it('aplica o mesmo termo a todos os registros do lote', async () => {
      prismaMock.alocacaoEquipamento.findMany.mockResolvedValue([
        { id: 'al1', status: 'ENTREGUE', termoCaminho: null },
        { id: 'al2', status: 'PENDENTE', termoCaminho: null },
      ]);

      await service.anexarTermoLote(['al1', 'al2'], arquivo);

      expect(prismaMock.alocacaoEquipamento.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['al1', 'al2'] } },
        data: expect.objectContaining({ status: 'ASSINADO', termoNome: 'termo.pdf' }),
      });
    });

    it('recusa quando algum id não existe', async () => {
      prismaMock.alocacaoEquipamento.findMany.mockResolvedValue([{ id: 'al1', status: 'ENTREGUE', termoCaminho: null }]);
      await expect(service.anexarTermoLote(['al1', 'al2'], arquivo)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.alocacaoEquipamento.updateMany).not.toHaveBeenCalled();
    });

    it('recusa quando algum registro do lote já foi encerrado', async () => {
      prismaMock.alocacaoEquipamento.findMany.mockResolvedValue([
        { id: 'al1', status: 'ENTREGUE', termoCaminho: null },
        { id: 'al2', status: 'DEVOLVIDO', termoCaminho: null },
      ]);
      await expect(service.anexarTermoLote(['al1', 'al2'], arquivo)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.alocacaoEquipamento.updateMany).not.toHaveBeenCalled();
    });
  });
});
