import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

describe('TelegramService event notifications', () => {
  const prisma = {
    telegramConfig: { findFirst: jest.fn() },
    telegramNotificacaoTipo: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  let service: TelegramService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: true, botToken: 'test-token' });
    prisma.telegramNotificacaoTipo.findUnique.mockResolvedValue({ enviar: true });
    prisma.user.findUnique.mockResolvedValue({ id: 'admin', telegramChatId: '123' });
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    service = new TelegramService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends one clearly labelled event simulation to the requesting admin', async () => {
    await expect(service.enviarTeste('admin')).resolves.toEqual({ enviado: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
    const body = JSON.parse(request.body);
    expect(body.chat_id).toBe('123');
    expect(body.text).toContain('TESTE — Simulação de evento');
    expect(body.text).toContain('Novo plantão vinculado!');
    expect(body.text).toContain('Nenhum plantão foi criado ou alterado.');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'admin' } });
  });

  it('keeps automatic event delivery enabled', async () => {
    await service.enviar('PLANTAO_VINCULADO', 'admin', 'Novo plantão vinculado!');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ chat_id: '123', text: 'Novo plantão vinculado!' });
  });

  it('does not deliver event types that are disabled', async () => {
    prisma.telegramNotificacaoTipo.findUnique.mockResolvedValue({ enviar: false });
    await service.enviar('PLANTAO_VINCULADO', 'admin', 'Evento');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a missing chat without sending the simulation', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin', telegramChatId: null });
    await expect(service.enviarTeste('admin')).resolves.toMatchObject({ enviado: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an inactive bot without sending the simulation', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: false, botToken: 'test-token' });
    await expect(service.enviarTeste('admin')).resolves.toMatchObject({ enviado: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('translates an invalid token response into an actionable message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }),
    } as Response);
    await expect(service.enviarTeste('admin')).resolves.toEqual({
      enviado: false,
      motivo: 'O token do bot é inválido ou foi revogado. Gere um novo em @BotFather e salve em Configurações > Telegram.',
    });
  });
});

describe('TelegramService connect link', () => {
  const prisma = {
    telegramConfig: { findFirst: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  let service: TelegramService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelegramService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('builds a one-click personal link from the bot username, without asking the user for anything', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: true, botToken: 'test-token' });
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ result: { username: 'portal_bot' } }) } as Response);

    await expect(service.getLinkDeConexao('user-1')).resolves.toEqual({
      link: 'https://t.me/portal_bot?start=user-1',
    });
  });

  it('reports when the bot is not configured yet, without calling Telegram', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: false, botToken: '' });
    fetchMock = jest.spyOn(global, 'fetch');

    await expect(service.getLinkDeConexao('user-1')).resolves.toMatchObject({ link: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('links the chat straight from the /start payload, matching by id instead of username', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111' });

    await service.processarWebhook({
      message: { text: '/start 11111111-1111-1111-1111-111111111111', chat: { id: 999 } },
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '11111111-1111-1111-1111-111111111111' } });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { telegramChatId: '999' },
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('falls back to matching by the registered username when there is no /start payload', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'user-2', telegramUsername: '@ana' }]);

    await service.processarWebhook({ message: { from: { username: 'Ana' }, chat: { id: 555 } } });

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-2' }, data: { telegramChatId: '555' } });
  });
});

describe('TelegramService group broadcast', () => {
  const prisma = {
    telegramConfig: { findFirst: jest.fn(), update: jest.fn() },
    telegramNotificacaoTipo: { findUnique: jest.fn(), findMany: jest.fn() },
    telegramGrupoConectado: { findMany: jest.fn(), upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    telegramGrupoDetectado: { findMany: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  let service: TelegramService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelegramService(prisma as unknown as PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('posts to every connected group/topic in HTML when the type has group broadcast on', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: true, botToken: 'test-token' });
    prisma.telegramNotificacaoTipo.findUnique.mockResolvedValue({ enviarGrupo: true });
    prisma.telegramGrupoConectado.findMany.mockResolvedValue([
      { id: 'g1', chatId: '-1001234', topicId: '42', nome: 'Ops' },
      { id: 'g2', chatId: '-1005678', topicId: '', nome: 'Outro time' },
    ]);
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await service.enviarGrupo('RESERVA_SALA_CRIADA', '<b>Sala reservada</b>');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url1, request1] = fetchMock.mock.calls[0];
    expect(url1).toBe('https://api.telegram.org/bottest-token/sendMessage');
    expect(JSON.parse(request1.body)).toEqual({
      chat_id: '-1001234',
      text: '<b>Sala reservada</b>',
      message_thread_id: 42,
      parse_mode: 'HTML',
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      chat_id: '-1005678',
      text: '<b>Sala reservada</b>',
      parse_mode: 'HTML',
    });
  });

  it('skips the group post when the type has group broadcast turned off', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: true, botToken: 'test-token' });
    prisma.telegramNotificacaoTipo.findUnique.mockResolvedValue({ enviarGrupo: false });
    prisma.telegramGrupoConectado.findMany.mockResolvedValue([{ id: 'g1', chatId: '-1001234', topicId: '' }]);
    fetchMock = jest.spyOn(global, 'fetch');

    await service.enviarGrupo('RESERVA_SALA_CRIADA', 'texto');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the group post when no group is connected yet', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ ativo: true, botToken: 'test-token' });
    prisma.telegramNotificacaoTipo.findUnique.mockResolvedValue({ enviarGrupo: true });
    prisma.telegramGrupoConectado.findMany.mockResolvedValue([]);
    fetchMock = jest.spyOn(global, 'fetch');

    await service.enviarGrupo('RESERVA_SALA_CRIADA', 'texto');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags which types can actually be broadcast to a group', async () => {
    prisma.telegramNotificacaoTipo.findMany.mockResolvedValue([
      { tipo: 'RESERVA_SALA_CRIADA', nome: 'Sala reservada', enviar: true, enviarGrupo: false },
      { tipo: 'PLANTAO_VINCULADO', nome: 'Plantão vinculado', enviar: true, enviarGrupo: false },
    ]);

    await expect(service.listTipos()).resolves.toEqual([
      { tipo: 'RESERVA_SALA_CRIADA', nome: 'Sala reservada', enviar: true, enviarGrupo: false, grupoDisponivel: true },
      { tipo: 'PLANTAO_VINCULADO', nome: 'Plantão vinculado', enviar: true, enviarGrupo: false, grupoDisponivel: false },
    ]);
  });

  it('adds a group to an already-configured bot, without touching the others', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ id: 'cfg1' });

    await service.adicionarGrupo({ chatId: '-100', topicId: '5', nome: 'Ops' });

    expect(prisma.telegramGrupoConectado.upsert).toHaveBeenCalledWith({
      where: { chatId_topicId: { chatId: '-100', topicId: '5' } },
      update: { nome: 'Ops' },
      create: { chatId: '-100', topicId: '5', nome: 'Ops' },
    });
  });

  it('refuses to connect a group before the bot token is configured', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue(null);
    await expect(service.adicionarGrupo({ chatId: '-100' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes one connected group by id', async () => {
    prisma.telegramGrupoConectado.findUnique.mockResolvedValue({ id: 'g1', chatId: '-100', topicId: '' });

    await service.removerGrupo('g1');

    expect(prisma.telegramGrupoConectado.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
  });

  it('records the chat_id/topic detected from a group message, for the admin to pick from', async () => {
    await service.processarWebhook({
      message: {
        text: 'oi',
        chat: { id: -1009999, type: 'supergroup', title: 'Time Ops' },
        message_thread_id: 42,
        is_topic_message: true,
      },
    });

    expect(prisma.telegramGrupoDetectado.upsert).toHaveBeenCalledWith({
      where: { chatId_topicId: { chatId: '-1009999', topicId: '42' } },
      update: { chatTitle: 'Time Ops' },
      create: { chatId: '-1009999', chatTitle: 'Time Ops', topicId: '42' },
    });
  });

  it('replies with the chat_id and topic_id when someone sends /id in a group topic', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ botToken: 'test-token' });
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await service.processarWebhook({
      message: {
        text: '/id',
        chat: { id: -1009999, type: 'supergroup', title: 'Time Ops' },
        message_thread_id: 42,
        is_topic_message: true,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('-1009999');
    expect(body.message_thread_id).toBe(42);
    expect(body.text).toContain('chat_id: -1009999');
    expect(body.text).toContain('topic_id: 42');
  });

  it('replies to /id in a private chat too, without a topic_id line', async () => {
    prisma.telegramConfig.findFirst.mockResolvedValue({ botToken: 'test-token' });
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await service.processarWebhook({ message: { text: '/id', chat: { id: 555, type: 'private' } } });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('555');
    expect(body.message_thread_id).toBeUndefined();
    expect(body.text).not.toContain('topic_id');
  });

  it('never lets a malformed update crash the webhook endpoint', async () => {
    prisma.telegramGrupoDetectado.upsert.mockRejectedValue(new Error('boom'));

    await expect(
      service.processarWebhook({ message: { chat: { id: -1, type: 'group' } } }),
    ).resolves.toBeUndefined();
  });
});
