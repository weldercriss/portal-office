import { Test } from '@nestjs/testing';
import { AniversariosService } from './aniversarios.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AniversariosService', () => {
  let service: AniversariosService;
  const prismaMock = { user: { findMany: jest.fn() } };
  const notificacoesMock = { criar: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-02T12:00:00Z'));
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

  it('skips everything when there is no RH recipient configured', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    await service.verificarAniversariosProximos();
    expect(notificacoesMock.criar).not.toHaveBeenCalled();
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('notifies RH recipients when a birthday is 5 days away', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'rh1' }])
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-07T00:00:00Z'), dataAdmissao: null },
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
        { id: 'c1', nome: 'Bruno', dataNascimento: null, dataAdmissao: new Date('2021-09-03T00:00:00Z') },
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
        { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-09-07T00:00:00Z'), dataAdmissao: null },
      ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });

  it('does not notify when the date is outside the 5/3/2/1 window', async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'rh1' }])
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Ana', dataNascimento: new Date('1995-10-20T00:00:00Z'), dataAdmissao: null },
      ]);

    await service.verificarAniversariosProximos();

    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });
});
