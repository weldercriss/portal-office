import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TiposSolicitacaoService } from './tipos-solicitacao.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TiposSolicitacaoService', () => {
  let service: TiposSolicitacaoService;
  const prismaMock = {
    tipoSolicitacao: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TiposSolicitacaoService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(TiposSolicitacaoService);
  });

  describe('create', () => {
    it('generates an id for every field that does not already have one', async () => {
      prismaMock.tipoSolicitacao.create.mockResolvedValue({ id: 't1' });
      await service.create({
        nome: 'Reembolso',
        usaFormulario: true,
        camposFormulario: [
          { label: 'Motivo', tipo: 'TEXTO' },
          { id: 'ja-tem-id', label: 'Valor', tipo: 'NUMERO' },
        ],
      });
      const campos = prismaMock.tipoSolicitacao.create.mock.calls[0][0].data.camposFormulario;
      expect(campos[0].id).toBeDefined();
      expect(campos[1].id).toBe('ja-tem-id');
    });

    it('leaves camposFormulario untouched when the type is not a form', async () => {
      prismaMock.tipoSolicitacao.create.mockResolvedValue({ id: 't1' });
      await service.create({ nome: 'Férias' });
      expect(prismaMock.tipoSolicitacao.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ camposFormulario: undefined }) }),
      );
    });

    it('rejects a public link without a form configured', async () => {
      await expect(service.create({ nome: 'Reembolso', permiteLinkPublico: true })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prismaMock.tipoSolicitacao.create).not.toHaveBeenCalled();
    });

    it('rejects a public link on a type that does not require approval', async () => {
      await expect(
        service.create({ nome: 'Reembolso', usaFormulario: true, permiteLinkPublico: true, requerAprovacao: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('generates a public token when the public link is allowed', async () => {
      prismaMock.tipoSolicitacao.create.mockResolvedValue({ id: 't1' });
      await service.create({ nome: 'Reembolso', usaFormulario: true, permiteLinkPublico: true });
      const dados = prismaMock.tipoSolicitacao.create.mock.calls[0][0].data;
      expect(typeof dados.tokenLinkPublico).toBe('string');
    });
  });

  describe('update', () => {
    it('throws when the type does not exist', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { nome: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('preserves existing field ids and only generates new ones for added fields', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue({ id: 't1' });
      prismaMock.tipoSolicitacao.update.mockResolvedValue({ id: 't1' });
      await service.update('t1', {
        camposFormulario: [
          { id: 'existente', label: 'Motivo', tipo: 'TEXTO' },
          { label: 'Novo campo', tipo: 'DATA' },
        ],
      });
      const campos = prismaMock.tipoSolicitacao.update.mock.calls[0][0].data.camposFormulario;
      expect(campos[0].id).toBe('existente');
      expect(campos[1].id).toBeDefined();
      expect(campos[1].id).not.toBe('existente');
    });

    it('generates a token the first time the public link is turned on', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue({
        id: 't1', usaFormulario: true, requerAprovacao: true, permiteLinkPublico: false, tokenLinkPublico: null,
      });
      prismaMock.tipoSolicitacao.update.mockResolvedValue({ id: 't1' });
      await service.update('t1', { permiteLinkPublico: true });
      const dados = prismaMock.tipoSolicitacao.update.mock.calls[0][0].data;
      expect(typeof dados.tokenLinkPublico).toBe('string');
    });

    it('keeps the same token on subsequent saves instead of regenerating it', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue({
        id: 't1', usaFormulario: true, requerAprovacao: true, permiteLinkPublico: true, tokenLinkPublico: 'ja-existe',
      });
      prismaMock.tipoSolicitacao.update.mockResolvedValue({ id: 't1' });
      await service.update('t1', { nome: 'Novo nome' });
      const dados = prismaMock.tipoSolicitacao.update.mock.calls[0][0].data;
      expect(dados.tokenLinkPublico).toBeUndefined();
    });

    it('rejects turning on the public link for a type that skips approval', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue({
        id: 't1', usaFormulario: true, requerAprovacao: false, permiteLinkPublico: false, tokenLinkPublico: null,
      });
      await expect(service.update('t1', { permiteLinkPublico: true })).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.tipoSolicitacao.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePermanently', () => {
    it('blocks deletion when solicitações are linked to the type', async () => {
      prismaMock.tipoSolicitacao.findUnique.mockResolvedValue({ id: 't1', _count: { solicitacoes: 2 } });
      await expect(service.deletePermanently('t1')).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.tipoSolicitacao.delete).not.toHaveBeenCalled();
    });
  });
});
