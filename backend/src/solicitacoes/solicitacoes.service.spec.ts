import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { SolicitacoesService } from './solicitacoes.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('fs/promises', () => ({ unlink: jest.fn().mockResolvedValue(undefined) }));

const TIPO_COM_APROVACAO = { id: 't1', nome: 'Férias', ativo: true, requerAprovacao: true, contaComoAfastamento: true };
const TIPO_SEM_APROVACAO = { id: 't2', nome: 'Advertência', ativo: true, requerAprovacao: false, contaComoAfastamento: false };
const CAMPO_TEXTO_OBRIGATORIO = { id: 'c1', label: 'Motivo', tipo: 'TEXTO', obrigatorio: true };
const TIPO_COM_FORMULARIO = {
  id: 't3',
  nome: 'Reembolso',
  ativo: true,
  requerAprovacao: true,
  usaFormulario: true,
  camposFormulario: [CAMPO_TEXTO_OBRIGATORIO],
  permiteLinkPublico: false,
};

describe('SolicitacoesService', () => {
  let service: SolicitacoesService;
  const prismaMock = {
    solicitacao: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    tipoSolicitacao: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const notificacoesMock = { criar: jest.fn(), criarParaAdmins: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SolicitacoesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesService, useValue: notificacoesMock },
      ],
    }).compile();
    service = moduleRef.get(SolicitacoesService);
  });

  describe('create (tipo com aprovação)', () => {
    it('rejects a period ending before it starts', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_COM_APROVACAO);
      await expect(
        service.create({ tipoId: 't1', dataInicio: '2026-09-10', dataFim: '2026-09-01' }, { id: 'u1', role: 'USER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.solicitacao.create).not.toHaveBeenCalled();
    });

    it('forces userId to the requester when a USER creates a request', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_COM_APROVACAO);
      prismaMock.solicitacao.create.mockResolvedValue({
        id: '1',
        userId: 'u1',
        dataInicio: new Date('2026-09-01'),
        dataFim: new Date('2026-09-10'),
        user: { nome: 'Ana' },
        tipo: TIPO_COM_APROVACAO,
      });
      await service.create(
        { tipoId: 't1', dataInicio: '2026-09-01', dataFim: '2026-09-10', userId: 'outro' },
        { id: 'u1', role: 'USER' },
      );
      expect(prismaMock.solicitacao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'u1' }) }),
      );
      expect(notificacoesMock.criarParaAdmins).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'SOLICITACAO_CRIADA' }));
    });

    it('lets an ADMIN create a request for another user without notifying admins', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_COM_APROVACAO);
      prismaMock.solicitacao.create.mockResolvedValue({
        id: '1',
        userId: 'outro',
        dataInicio: new Date('2026-09-01'),
        dataFim: new Date('2026-09-10'),
        user: { nome: 'Bia' },
        tipo: TIPO_COM_APROVACAO,
      });
      await service.create(
        { tipoId: 't1', dataInicio: '2026-09-01', dataFim: '2026-09-10', userId: 'outro' },
        { id: 'admin1', role: 'ADMIN' },
      );
      expect(prismaMock.solicitacao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'outro' }) }),
      );
      expect(notificacoesMock.criarParaAdmins).not.toHaveBeenCalled();
    });
  });

  describe('create (tipo sem aprovação)', () => {
    it('rejects when a non-admin tries to register it directly', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_SEM_APROVACAO);
      await expect(
        service.create({ tipoId: 't2', userId: 'u1', dataInicio: '2026-09-01' }, { id: 'u1', role: 'USER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates it already approved, decided by the admin who registered it', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_SEM_APROVACAO);
      prismaMock.solicitacao.create.mockResolvedValue({ id: '1', status: 'APROVADA' });
      await service.create({ tipoId: 't2', userId: 'u1', dataInicio: '2026-09-01' }, { id: 'admin1', role: 'ADMIN' });
      expect(prismaMock.solicitacao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APROVADA', decididoPorId: 'admin1', registradoPorId: 'admin1' }),
        }),
      );
    });
  });

  describe('responsável opcional', () => {
    it.each([TIPO_COM_APROVACAO, TIPO_SEM_APROVACAO])('saves an active responsible person for $nome', async (tipo) => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(tipo);
      prismaMock.user.findUnique.mockResolvedValue({ ativo: true });
      prismaMock.solicitacao.create.mockResolvedValue({ id: '1' });
      await service.create(
        { tipoId: tipo.id, userId: 'u1', dataInicio: '2026-09-01', responsavelId: 'u2' },
        { id: 'admin1', role: 'ADMIN' },
      );
      expect(prismaMock.solicitacao.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ responsavelId: 'u2' }),
        include: expect.objectContaining({ responsavel: { select: { id: true, nome: true } } }),
      }));
    });

    it.each([null, { ativo: false }])('rejects a missing or inactive responsible person (%j)', async (responsavel) => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_COM_APROVACAO);
      prismaMock.user.findUnique.mockResolvedValue(responsavel);
      await expect(service.create(
        { tipoId: 't1', userId: 'u1', dataInicio: '2026-09-01', responsavelId: 'u2' },
        { id: 'admin1', role: 'ADMIN' },
      )).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.solicitacao.create).not.toHaveBeenCalled();
    });

    it.each([undefined, null, 'u3'])('preserves, clears or replaces the responsible person (%s)', async (responsavelId) => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({
        id: '1', tipo: TIPO_SEM_APROVACAO, dataInicio: new Date('2026-09-01'), responsavelId: 'u2',
      });
      prismaMock.user.findUnique.mockResolvedValue({ ativo: true });
      await service.update('1', { responsavelId });
      expect(prismaMock.solicitacao.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ responsavelId }),
      }));
      if (!responsavelId) expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('keeps an existing responsible person when they have become inactive', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({
        id: '1', tipo: TIPO_SEM_APROVACAO, dataInicio: new Date('2026-09-01'), responsavelId: 'u2',
      });
      await service.update('1', { responsavelId: 'u2', descricao: 'Atualizada' });
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.solicitacao.update).toHaveBeenCalled();
    });
  });

  describe('aprovar/rejeitar', () => {
    it('rejects deciding a request whose type has no approval flow', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: '1', status: 'APROVADA', tipo: TIPO_SEM_APROVACAO });
      await expect(service.aprovar('1', 'admin1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects deciding a request that was already decided', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: '1', status: 'APROVADA', tipo: TIPO_COM_APROVACAO });
      await expect(service.aprovar('1', 'admin1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves a pending request and notifies the collaborator', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: '1', status: 'SOLICITADA', tipo: TIPO_COM_APROVACAO });
      prismaMock.solicitacao.update.mockResolvedValue({
        id: '1',
        userId: 'u1',
        status: 'APROVADA',
        dataInicio: new Date('2026-09-01'),
        dataFim: new Date('2026-09-10'),
        tipo: TIPO_COM_APROVACAO,
      });
      await service.aprovar('1', 'admin1');
      expect(notificacoesMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', tipo: 'SOLICITACAO_APROVADA' }),
      );
    });
  });

  describe('cancelar', () => {
    it("rejects cancelling someone else's request", async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: '1', userId: 'u1', status: 'SOLICITADA', tipo: TIPO_COM_APROVACAO });
      await expect(service.cancelar('1', { id: 'u2', role: 'USER' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects cancelling an already-decided request', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: '1', userId: 'u1', status: 'APROVADA', tipo: TIPO_COM_APROVACAO });
      await expect(service.cancelar('1', { id: 'u1', role: 'USER' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects cancelling a type without an approval flow', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: '1', userId: 'u1', status: 'APROVADA', tipo: TIPO_SEM_APROVACAO });
      await expect(service.cancelar('1', { id: 'u1', role: 'USER' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove/findOne', () => {
    it('throws when a solicitação is not found', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('formulário dinâmico — create', () => {
    it('rejects creating without a value for a required non-file field', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_COM_FORMULARIO);
      await expect(
        service.create({ tipoId: 't3', dataInicio: '2026-09-01', respostasFormulario: {} }, { id: 'u1', role: 'USER' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.solicitacao.create).not.toHaveBeenCalled();
    });

    it('rejects a response key that does not match any configured field', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_COM_FORMULARIO);
      await expect(
        service.create(
          { tipoId: 't3', dataInicio: '2026-09-01', respostasFormulario: { c1: 'ok', desconhecido: 'x' } },
          { id: 'u1', role: 'USER' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not require a value for a required ARQUIVO field on creation', async () => {
      const tipoComArquivo = {
        ...TIPO_COM_FORMULARIO,
        camposFormulario: [{ id: 'c2', label: 'Comprovante', tipo: 'ARQUIVO', obrigatorio: true }],
      };
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(tipoComArquivo);
      prismaMock.solicitacao.create.mockResolvedValue({ id: '1', user: { nome: 'Ana' }, tipo: tipoComArquivo });
      await expect(
        service.create({ tipoId: 't3', dataInicio: '2026-09-01' }, { id: 'u1', role: 'USER' }),
      ).resolves.toBeDefined();
    });
  });

  describe('formulário dinâmico — update faz merge', () => {
    it('merges new responses into the existing ones instead of replacing them', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({
        id: '1',
        status: 'SOLICITADA',
        tipo: TIPO_COM_FORMULARIO,
        dataInicio: new Date('2026-09-01'),
        respostasFormulario: { c1: 'valor antigo', c2: { nome: 'a.pdf', caminho: 'x.pdf', mimeType: 'application/pdf' } },
      });
      await service.update('1', { respostasFormulario: { c1: 'valor novo' } });
      expect(prismaMock.solicitacao.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            respostasFormulario: {
              c1: 'valor novo',
              c2: { nome: 'a.pdf', caminho: 'x.pdf', mimeType: 'application/pdf' },
            },
          }),
        }),
      );
    });
  });

  describe('remove — limpa arquivos de campos de formulário', () => {
    it('unlinks every file answer before deleting the solicitação', async () => {
      prismaMock.solicitacao.findUnique.mockResolvedValue({
        id: '1',
        anexoCaminho: null,
        respostasFormulario: {
          c1: 'texto, sem arquivo',
          c2: { nome: 'a.pdf', caminho: 'a.pdf', mimeType: 'application/pdf' },
        },
      });
      await service.remove('1');
      expect(unlink).toHaveBeenCalledTimes(1);
      expect(prismaMock.solicitacao.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('formulário público (link fixo do tipo)', () => {
    const TIPO_PUBLICO = {
      id: 't3',
      nome: 'Reembolso',
      ativo: true,
      permiteLinkPublico: true,
      camposFormulario: [CAMPO_TEXTO_OBRIGATORIO],
    };

    it('returns the blank form when the token is valid', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_PUBLICO);
      const resultado = await service.obterFormularioPublico('token-valido');
      expect(resultado).toEqual({ tipoNome: 'Reembolso', camposFormulario: TIPO_PUBLICO.camposFormulario });
    });

    it('rejects when the token does not exist', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(null);
      await expect(service.obterFormularioPublico('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects the same way when the type no longer allows the public link', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue({ ...TIPO_PUBLICO, permiteLinkPublico: false });
      await expect(service.obterFormularioPublico('token-desativado')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates an anonymous solicitação (no colaborador attached) on submit', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_PUBLICO);
      prismaMock.solicitacao.create.mockResolvedValue({ id: 's1' });
      const resultado = await service.criarSolicitacaoPublica('token-valido', { c1: 'ok' });
      expect(resultado).toEqual({ id: 's1' });
      const dadosGravados = prismaMock.solicitacao.create.mock.calls[0][0].data;
      expect(dadosGravados).toMatchObject({ tipoId: 't3', status: 'SOLICITADA', respostasFormulario: { c1: 'ok' } });
      expect(dadosGravados.userId).toBeUndefined();
      expect(dadosGravados.registradoPorId).toBeUndefined();
      expect(notificacoesMock.criarParaAdmins).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'SOLICITACAO_CRIADA' }));
    });

    it('rejects an anonymous submission missing a required field', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_PUBLICO);
      await expect(service.criarSolicitacaoPublica('token-valido', {})).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.solicitacao.create).not.toHaveBeenCalled();
    });

    it('attaches a file to a just-created anonymous response of the same type', async () => {
      const tipoComArquivo = { ...TIPO_PUBLICO, camposFormulario: [{ id: 'c2', label: 'Comprovante', tipo: 'ARQUIVO' }] };
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(tipoComArquivo);
      prismaMock.solicitacao.findUnique.mockResolvedValue({
        id: 's1', tipoId: 't3', userId: null, status: 'SOLICITADA', respostasFormulario: {},
      });
      await service.anexarCampoFormularioPublico('token-valido', 's1', 'c2', {
        originalname: 'a.pdf', filename: 'a.pdf', mimetype: 'application/pdf',
      } as any);
      expect(prismaMock.solicitacao.update).toHaveBeenCalled();
    });

    it('rejects attaching a file to a solicitação from a different type', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_PUBLICO);
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: 's1', tipoId: 'outro-tipo', userId: null, status: 'SOLICITADA' });
      await expect(
        service.anexarCampoFormularioPublico('token-valido', 's1', 'c2', { path: 'x' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects attaching a file to a solicitação already claimed by a colaborador', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(TIPO_PUBLICO);
      prismaMock.solicitacao.findUnique.mockResolvedValue({ id: 's1', tipoId: 't3', userId: 'u1', status: 'SOLICITADA' });
      await expect(
        service.anexarCampoFormularioPublico('token-valido', 's1', 'c2', { path: 'x' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('existeAfastamentoNoPeriodo', () => {
    it('only matches absence-counting types, approved, covering the date', async () => {
      prismaMock.solicitacao.findFirst.mockResolvedValue({ id: '1', tipo: TIPO_COM_APROVACAO });
      const resultado = await service.existeAfastamentoNoPeriodo('u1', new Date('2026-09-05'));
      expect(resultado).toEqual({ id: '1', tipo: TIPO_COM_APROVACAO });
      expect(prismaMock.solicitacao.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u1',
            status: 'APROVADA',
            tipo: { contaComoAfastamento: true },
          }),
        }),
      );
    });

    it('returns null when there is none', async () => {
      prismaMock.solicitacao.findFirst.mockResolvedValue(null);
      await expect(service.existeAfastamentoNoPeriodo('u1', new Date('2026-09-05'))).resolves.toBeNull();
    });
  });
});
