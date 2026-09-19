import { Test } from '@nestjs/testing';
import { AniversariosService } from './aniversarios.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AniversariosService', () => {
  let service: AniversariosService;
  const prismaMock = {
    user: { findMany: jest.fn() },
    configAvisoAniversario: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  const notificacoesMock = { criar: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-02T12:00:00Z'));
    prismaMock.configAvisoAniversario.findUnique.mockResolvedValue(null);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AniversariosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesService, useValue: notificacoesMock },
      ],
    }).compile();
    service = moduleRef.get(AniversariosService);
  });

  afterEach(() => jest.useRealTimers());

  it('does nothing when there are no RH recipients, no gestor and no colaborador with dates', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await service.verificarAniversariosProximos();
    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });

  it('notifies RH recipients when a birthday is 5 days away (dias padrão sem config)', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'rh1' }])
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-07T00:00:00Z'), dataAdmissao: null, gestorId: null },
      ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'rh1', tipo: 'ANIVERSARIO_PROXIMO' }),
    );
  });

  it('notifies RH recipients when a work anniversary is 1 day away', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'rh1' }])
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Bruno', dataNascimento: null, dataAdmissao: new Date('2021-09-03T00:00:00Z'), gestorId: null },
      ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'rh1', tipo: 'ANIVERSARIO_ADMISSAO_PROXIMO' }),
    );
  });

  it('does not notify a recipient about their own upcoming date', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'c1' }])
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-07T00:00:00Z'), dataAdmissao: null, gestorId: null },
      ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });

  it('does not notify when the date is outside the configured window', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'rh1' }])
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-10-20T00:00:00Z'), dataAdmissao: null, gestorId: null },
      ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });

  it('avisa também o gestor direto, mesmo sem nenhum destinatário de RH configurado', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-07T00:00:00Z'), dataAdmissao: null, gestorId: 'gestor1' },
    ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).toHaveBeenCalledTimes(1);
    expect(notificacoesMock.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'gestor1', tipo: 'ANIVERSARIO_PROXIMO' }),
    );
  });

  it('não duplica aviso quando o gestor também está na lista de RH', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'gestor1' }]).mockResolvedValueOnce([
      { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-07T00:00:00Z'), dataAdmissao: null, gestorId: 'gestor1' },
    ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).toHaveBeenCalledTimes(1);
  });

  it('usa os dias de antecedência configurados em vez do padrão', async () => {
    prismaMock.configAvisoAniversario.findUnique.mockResolvedValue({ diasAntecedencia: [7] });
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'rh1' }]).mockResolvedValueOnce([
      { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-09T00:00:00Z'), dataAdmissao: null, gestorId: null },
    ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'rh1', tipo: 'ANIVERSARIO_PROXIMO' }),
    );
  });

  describe('getConfig/updateConfig', () => {
    it('retorna o padrão quando a linha ainda não existe', async () => {
      prismaMock.configAvisoAniversario.findUnique.mockResolvedValue(null);
      expect(await service.getConfig()).toEqual({ diasAntecedencia: [15, 10, 5, 3, 1] });
    });

    it('faz upsert com o array informado', async () => {
      prismaMock.configAvisoAniversario.upsert.mockResolvedValue({ diasAntecedencia: [7, 1] });
      const resultado = await service.updateConfig({ diasAntecedencia: [7, 1] });
      expect(prismaMock.configAvisoAniversario.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'global' } }),
      );
      expect(resultado).toEqual({ diasAntecedencia: [7, 1] });
    });
  });
});
