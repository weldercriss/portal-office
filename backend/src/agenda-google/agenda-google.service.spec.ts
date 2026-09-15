import { AgendaGoogleAutorizacaoPerdida } from './agenda-google-oauth.service';
import { AgendaGoogleService, montarEvento } from './agenda-google.service';
import { eventIdDeterministico } from './google-calendar.client';

const TIPO_MANHA = { nome: 'Sobreaviso', horaInicio: '08:00', horaFim: '17:00' };

const PLANTAO_BASE = {
  id: 'p1',
  nome: null as string | null,
  data: new Date('2026-09-10T00:00:00.000Z'),
  status: 'PUBLICADO',
  tipoPlantao: TIPO_MANHA,
  user: { id: 'u1', nome: 'Ana', email: 'ana@empresa.com', ativo: true, agendaGoogleAtiva: true },
};

describe('montarEvento', () => {
  beforeAll(() => {
    process.env.GOOGLE_CALENDAR_TIMEZONE = 'America/Sao_Paulo';
    process.env.APP_PUBLIC_URL = 'https://portal.exemplo.com.br';
  });

  afterAll(() => {
    delete process.env.GOOGLE_CALENDAR_TIMEZONE;
    delete process.env.APP_PUBLIC_URL;
  });

  it('usa o horário do tipo de plantão no fuso configurado', () => {
    const evento = montarEvento(PLANTAO_BASE);
    expect(evento.start).toEqual({ dateTime: '2026-09-10T08:00:00', timeZone: 'America/Sao_Paulo' });
    expect(evento.end).toEqual({ dateTime: '2026-09-10T17:00:00', timeZone: 'America/Sao_Paulo' });
    expect(evento.summary).toBe('Plantão — Sobreaviso');
    expect(evento.extendedProperties?.private).toMatchObject({ plantaoId: 'p1' });
  });

  it('termina no dia seguinte quando o horário vira a meia-noite', () => {
    const evento = montarEvento({ ...PLANTAO_BASE, tipoPlantao: { nome: 'Noite', horaInicio: '22:00', horaFim: '06:00' } });
    expect(evento.start).toMatchObject({ dateTime: '2026-09-10T22:00:00' });
    expect(evento.end).toMatchObject({ dateTime: '2026-09-11T06:00:00' });
  });

  it('vira evento de dia inteiro sem tipo de plantão, com fim exclusivo', () => {
    const evento = montarEvento({ ...PLANTAO_BASE, tipoPlantao: null });
    expect(evento.start).toEqual({ date: '2026-09-10' });
    expect(evento.end).toEqual({ date: '2026-09-11' });
  });

  it('ignora hora inválida e cai para o dia inteiro', () => {
    const evento = montarEvento({
      ...PLANTAO_BASE,
      tipoPlantao: { nome: 'Quebrado', horaInicio: '25:99', horaFim: '17:00' },
    });
    expect(evento.start).toEqual({ date: '2026-09-10' });
  });

  it('prefere o nome do plantão como título', () => {
    const evento = montarEvento({ ...PLANTAO_BASE, nome: 'Plantão de virada' });
    expect(evento.summary).toBe('Plantão de virada');
  });

  it('mantém o dia do plantão sem deslocar pelo fuso do servidor', () => {
    const evento = montarEvento({ ...PLANTAO_BASE, data: new Date('2026-01-01T00:00:00.000Z') });
    expect(evento.start).toMatchObject({ dateTime: '2026-01-01T08:00:00' });
  });
});

describe('eventIdDeterministico', () => {
  it('repete o mesmo ID para o mesmo par plantão/usuário', () => {
    expect(eventIdDeterministico('p1', 'u1')).toBe(eventIdDeterministico('p1', 'u1'));
    expect(eventIdDeterministico('p1', 'u1')).not.toBe(eventIdDeterministico('p1', 'u2'));
  });

  it('usa só os caracteres aceitos pela Calendar API', () => {
    expect(eventIdDeterministico('p1', 'u1')).toMatch(/^[0-9a-v]{5,1024}$/);
  });
});

describe('AgendaGoogleService', () => {
  const prismaMock = {
    plantao: { findUnique: jest.fn(), findMany: jest.fn() },
    plantaoEventoAgenda: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    agendaSyncPendente: { upsert: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (operacoes: unknown[]) => operacoes),
  };
  const calendarMock = { habilitado: true, criar: jest.fn(), atualizar: jest.fn(), remover: jest.fn() };
  const oauthMock = { conexaoDoUsuario: jest.fn(), desconectar: jest.fn() };

  const CONEXAO_ANA = {
    googleSub: 'sub-ana',
    googleEmail: 'ana@empresa.com',
    status: 'CONECTADA',
    refreshTokenCriptografado: 'v1.a.b.c',
  };

  let service: AgendaGoogleService;

  const vinculo = {
    id: 'v1',
    plantaoId: 'p1',
    userId: 'u1',
    usuarioEmail: 'ana@empresa.com',
    googleSub: 'sub-ana',
    calendarId: 'primary',
    eventId: 'evento-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    calendarMock.habilitado = true;
    calendarMock.criar.mockResolvedValue('evento-novo');
    calendarMock.atualizar.mockResolvedValue(true);
    oauthMock.conexaoDoUsuario.mockResolvedValue(CONEXAO_ANA);
    prismaMock.plantao.findUnique.mockResolvedValue({ ...PLANTAO_BASE });
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([]);
    prismaMock.plantaoEventoAgenda.count.mockResolvedValue(0);
    service = new AgendaGoogleService(prismaMock as never, calendarMock as never, oauthMock as never);
  });

  it('cria o evento no primeiro envio e guarda o vínculo com a identidade Google', async () => {
    const { falhas } = await service.sincronizar('p1');

    expect(falhas).toEqual([]);
    expect(calendarMock.criar).toHaveBeenCalledWith(
      'u1',
      'primary',
      eventIdDeterministico('p1', 'u1'),
      expect.objectContaining({ summary: 'Plantão — Sobreaviso' }),
    );
    expect(prismaMock.plantaoEventoAgenda.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { plantaoId_userId: { plantaoId: 'p1', userId: 'u1' } },
        create: expect.objectContaining({ eventId: 'evento-novo', googleSub: 'sub-ana' }),
      }),
    );
  });

  it('atualiza o evento existente em vez de duplicar', async () => {
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);

    await service.sincronizar('p1');

    expect(calendarMock.atualizar).toHaveBeenCalledWith('u1', 'primary', 'evento-1', expect.anything());
    expect(calendarMock.criar).not.toHaveBeenCalled();
  });

  it('recria o evento que a pessoa apagou na própria agenda', async () => {
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);
    calendarMock.atualizar.mockResolvedValue(false);

    await service.sincronizar('p1');

    expect(prismaMock.plantaoEventoAgenda.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    expect(calendarMock.criar).toHaveBeenCalled();
  });

  it('remove o evento quando o plantão volta a rascunho', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue({ ...PLANTAO_BASE, status: 'RASCUNHO' });
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);

    await service.sincronizar('p1');

    expect(calendarMock.remover).toHaveBeenCalledWith('u1', 'primary', 'evento-1');
    expect(prismaMock.plantaoEventoAgenda.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    expect(calendarMock.criar).not.toHaveBeenCalled();
  });

  it('limpa a agenda de um plantão já excluído', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue(null);
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);

    await service.sincronizar('p1');

    expect(calendarMock.remover).toHaveBeenCalledWith('u1', 'primary', 'evento-1');
  });

  it('move o evento quando o plantão troca de plantonista', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue({
      ...PLANTAO_BASE,
      user: { id: 'u2', nome: 'Bruno', email: 'bruno@empresa.com', ativo: true, agendaGoogleAtiva: true },
    });
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);

    await service.sincronizar('p1');

    expect(calendarMock.remover).toHaveBeenCalledWith('u1', 'primary', 'evento-1');
    expect(calendarMock.criar).toHaveBeenCalledWith('u2', 'primary', eventIdDeterministico('p1', 'u2'), expect.anything());
  });

  it('cria para quem assumiu mesmo quando a limpeza do anterior exige reconexão', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue({
      ...PLANTAO_BASE,
      user: { id: 'u2', nome: 'Bruno', email: 'bruno@empresa.com', ativo: true, agendaGoogleAtiva: true },
    });
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);
    calendarMock.remover.mockRejectedValue(new AgendaGoogleAutorizacaoPerdida('u1', 'invalid_grant'));

    const { falhas } = await service.sincronizar('p1');

    expect(calendarMock.criar).toHaveBeenCalledWith('u2', 'primary', expect.any(String), expect.anything());
    expect(falhas).toEqual([{ userId: 'u1', motivo: 'RECONEXAO', mensagem: 'invalid_grant' }]);
    // O vínculo antigo continua até a limpeza acontecer de verdade.
    expect(prismaMock.plantaoEventoAgenda.delete).not.toHaveBeenCalled();
  });

  it('não apaga o evento de outra conta quando a identidade Google mudou', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue({ ...PLANTAO_BASE, status: 'RASCUNHO' });
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);
    oauthMock.conexaoDoUsuario.mockResolvedValue({ ...CONEXAO_ANA, googleSub: 'sub-outro' });

    const { falhas } = await service.sincronizar('p1');

    expect(calendarMock.remover).not.toHaveBeenCalled();
    expect(prismaMock.plantaoEventoAgenda.delete).not.toHaveBeenCalled();
    expect(falhas).toEqual([{ userId: 'u1', motivo: 'RECONEXAO', mensagem: 'identidade_google_diferente' }]);
  });

  it('classifica falha de rede como transitória', async () => {
    calendarMock.criar.mockRejectedValue(new Error('socket hang up'));

    const { falhas } = await service.sincronizar('p1');

    expect(falhas).toEqual([{ userId: 'u1', motivo: 'TRANSITORIA', mensagem: 'socket hang up' }]);
  });

  it('respeita quem desligou a sincronização', async () => {
    prismaMock.plantao.findUnique.mockResolvedValue({
      ...PLANTAO_BASE,
      user: { ...PLANTAO_BASE.user, agendaGoogleAtiva: false },
    });
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);

    await service.sincronizar('p1');

    expect(calendarMock.remover).toHaveBeenCalled();
    expect(calendarMock.criar).not.toHaveBeenCalled();
  });

  it('não chama o Google para quem ainda não conectou a agenda', async () => {
    oauthMock.conexaoDoUsuario.mockResolvedValue(null);

    const { falhas } = await service.sincronizar('p1');

    expect(calendarMock.criar).not.toHaveBeenCalled();
    expect(falhas).toEqual([]);
  });

  it('não escreve na agenda de quem desconectou, mas preserva o vínculo', async () => {
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([vinculo]);
    oauthMock.conexaoDoUsuario.mockResolvedValue({ ...CONEXAO_ANA, status: 'DESCONECTADA', refreshTokenCriptografado: null });

    await service.sincronizar('p1');

    expect(calendarMock.atualizar).not.toHaveBeenCalled();
    expect(calendarMock.criar).not.toHaveBeenCalled();
    expect(prismaMock.plantaoEventoAgenda.delete).not.toHaveBeenCalled();
  });

  it('não enfileira quando a integração está desligada', async () => {
    calendarMock.habilitado = false;
    await service.enfileirar(['p1']);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('enfileira sem repetir o mesmo plantão', async () => {
    await service.enfileirar(['p1', 'p1', 'p2']);
    expect(prismaMock.agendaSyncPendente.upsert).toHaveBeenCalledTimes(2);
  });

  it('não deixa a falha da fila derrubar a operação do plantão', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(new Error('banco fora'));
    await expect(service.enfileirar(['p1'])).resolves.toBeUndefined();
  });

  it('reprocessa os plantões da pessoa ao mudar a preferência', async () => {
    prismaMock.user.update.mockResolvedValue({ id: 'u1' });
    prismaMock.user.findUnique.mockResolvedValue({ agendaGoogleAtiva: false });
    prismaMock.plantao.findMany.mockResolvedValue([{ id: 'p9' }]);
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([{ plantaoId: 'p8' }]);
    prismaMock.plantaoEventoAgenda.count.mockResolvedValue(1);

    const status = await service.definirPreferencia('u1', false);

    expect(prismaMock.agendaSyncPendente.upsert).toHaveBeenCalledTimes(2);
    expect(status).toMatchObject({ ativa: false, limpezaPendente: true });
  });

  it('reativa as pendências que esperavam a reconexão', async () => {
    prismaMock.plantao.findMany.mockResolvedValue([]);
    prismaMock.plantaoEventoAgenda.findMany.mockResolvedValue([]);

    await service.reprocessarDoUsuario('u1');

    expect(prismaMock.agendaSyncPendente.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { aguardandoReconexaoUserId: 'u1' },
        data: expect.objectContaining({ aguardandoReconexaoUserId: null, tentativas: 0 }),
      }),
    );
  });

  it('descreve a conexão no status sem devolver o token guardado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ agendaGoogleAtiva: true });

    const status = await service.statusDoUsuario('u1');

    expect(status).toEqual({
      habilitado: true,
      ativa: true,
      conexao: 'CONECTADA',
      googleEmail: 'ana@empresa.com',
      limpezaPendente: false,
    });
    expect(JSON.stringify(status)).not.toContain('v1.a.b.c');
  });

  it('mostra a conexão perdida como reconectar', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ agendaGoogleAtiva: true });
    oauthMock.conexaoDoUsuario.mockResolvedValue({ ...CONEXAO_ANA, status: 'RECONECTAR' });

    expect(await service.statusDoUsuario('u1')).toMatchObject({ conexao: 'RECONECTAR' });
  });

  it('desconectar apaga as credenciais e mantém os eventos', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ agendaGoogleAtiva: true });
    oauthMock.conexaoDoUsuario.mockResolvedValue({ ...CONEXAO_ANA, status: 'DESCONECTADA', refreshTokenCriptografado: null });
    prismaMock.plantaoEventoAgenda.count.mockResolvedValue(3);

    const status = await service.desconectar('u1');

    expect(oauthMock.desconectar).toHaveBeenCalledWith('u1');
    expect(status).toMatchObject({ conexao: 'NAO_CONECTADA', googleEmail: null });
  });
});
