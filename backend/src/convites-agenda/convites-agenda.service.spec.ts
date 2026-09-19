import { AgendaGoogleAutorizacaoPerdida } from '../agenda-google/agenda-google-oauth.service';
import { ConviteAgendaConflitoRemoto } from '../agenda-google/google-calendar.client';
import { ConvitesAgendaService } from './convites-agenda.service';

describe('ConvitesAgendaService', () => {
  const txMock = {
    conviteAgendaEvento: { create: jest.fn() },
    conviteAgendaDestinatario: { createMany: jest.fn() },
  };
  const prismaMock = {
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    conviteAgendaEvento: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    conviteAgendaDestinatario: { update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  };
  const calendarMock = {
    criar: jest.fn(),
    remover: jest.fn(),
    criarComConvidados: jest.fn(),
    atualizarComConvidados: jest.fn(),
    cancelarComConvidados: jest.fn(),
    obterComConvidados: jest.fn(),
    consultarLivreOcupado: jest.fn(),
  };
  const agendaGoogleMock = {
    statusDoUsuario: jest.fn(),
    conexaoUtilizavel: jest.fn(),
    conexoesUtilizaveis: jest.fn(),
  };

  const CONVITE_NOVO = {
    id: 'c1',
    titulo: 'Kickoff Q4',
    descricao: null,
    local: null,
    inicio: new Date('2026-10-01T14:00:00.000Z'),
    fim: new Date('2026-10-01T15:00:00.000Z'),
    criadoPorId: 'admin1',
    criadoEm: new Date(),
    modo: 'EVENTO_COM_CONVIDADOS' as const,
    comMeet: true,
  };

  let service: ConvitesAgendaService;
  const envAnterior = process.env.GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED = 'true';
    txMock.conviteAgendaEvento.create.mockResolvedValue(CONVITE_NOVO);
    prismaMock.conviteAgendaEvento.findUnique.mockResolvedValue({ ...CONVITE_NOVO, destinatarios: [] });
    prismaMock.user.findUnique.mockResolvedValue({ email: 'admin@empresa.com' });
    agendaGoogleMock.conexaoUtilizavel.mockResolvedValue({ googleSub: 'sub1', googleEmail: 'admin@empresa.com' });
    calendarMock.criarComConvidados.mockResolvedValue('evento-google-1');
    service = new ConvitesAgendaService(prismaMock as never, calendarMock as never, agendaGoogleMock as never);
  });

  afterAll(() => {
    process.env.GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED = envAnterior;
  });

  describe('colaboradores', () => {
    it('lista colaboradores ativos, todos selecionáveis', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'u1', nome: 'Ana', email: 'ana@empresa.com' }]);
      await expect(service.colaboradores()).resolves.toEqual([{ id: 'u1', nome: 'Ana', email: 'ana@empresa.com' }]);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ativo: true } }));
    });
  });

  describe('organizadorStatus', () => {
    it('reporta conectado e o e-mail', async () => {
      agendaGoogleMock.statusDoUsuario.mockResolvedValue({ conexao: 'CONECTADA', googleEmail: 'admin@empresa.com' });
      await expect(service.organizadorStatus('admin1')).resolves.toEqual({
        conectado: true,
        email: 'admin@empresa.com',
        precisaReconectar: false,
        podeConsultarDisponibilidade: true,
      });
    });

    it('reporta necessidade de reconexão', async () => {
      agendaGoogleMock.statusDoUsuario.mockResolvedValue({ conexao: 'RECONECTAR', googleEmail: null });
      await expect(service.organizadorStatus('admin1')).resolves.toMatchObject({ conectado: false, precisaReconectar: true });
    });
  });

  describe('verificar', () => {
    it('rejeita intervalo com fim antes do início', async () => {
      await expect(
        service.verificar({ inicio: '2026-10-01T15:00:00.000Z', fim: '2026-10-01T14:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] }, 'admin1'),
      ).rejects.toThrow('O fim do evento precisa ser depois do início.');
    });

    it('sem conexão do organizador, devolve DESCONHECIDO sem chamar o Google', async () => {
      agendaGoogleMock.conexaoUtilizavel.mockResolvedValue(null);

      const resultado = await service.verificar(
        { inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['Ana@Empresa.com'] },
        'admin1',
      );

      expect(resultado).toEqual([{ email: 'ana@empresa.com', status: 'DESCONHECIDO', ocupado: [] }]);
      expect(calendarMock.consultarLivreOcupado).not.toHaveBeenCalled();
    });

    it('consulta livre/ocupado com o token do organizador', async () => {
      calendarMock.consultarLivreOcupado.mockResolvedValue([{ email: 'ana@empresa.com', status: 'LIVRE', ocupado: [] }]);

      await service.verificar({ inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] }, 'admin1');

      expect(calendarMock.consultarLivreOcupado).toHaveBeenCalledWith('admin1', ['ana@empresa.com'], '2026-10-01T14:00:00.000Z', '2026-10-01T15:00:00.000Z');
    });
  });

  describe('criar', () => {
    it('recusa quando a integração está desligada', async () => {
      process.env.GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED = 'false';
      await expect(
        service.criar({ titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] }, 'admin1'),
      ).rejects.toThrow('Convites de agenda por e-mail ainda não foram habilitados');
    });

    it('exige o organizador conectado', async () => {
      agendaGoogleMock.conexaoUtilizavel.mockResolvedValue(null);
      await expect(
        service.criar({ titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] }, 'admin1'),
      ).rejects.toThrow('Conecte a Agenda Google');
    });

    it('normaliza, deduplica e remove o e-mail do organizador', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.criar(
        {
          titulo: 'Kickoff',
          inicio: '2026-10-01T14:00:00.000Z',
          fim: '2026-10-01T15:00:00.000Z',
          destinatarioEmails: ['Ana@Empresa.com', 'ana@empresa.com', 'admin@empresa.com'],
        },
        'admin1',
      );

      expect(txMock.conviteAgendaDestinatario.createMany).toHaveBeenCalledWith({
        data: [{ conviteId: 'c1', email: 'ana@empresa.com', userId: undefined, nome: undefined }],
      });
    });

    it('rejeita e-mail fora do domínio permitido', async () => {
      process.env.GOOGLE_CALENDAR_INVITE_ALLOWED_DOMAINS = 'empresa.com';
      prismaMock.user.findMany.mockResolvedValue([]);

      await expect(
        service.criar(
          { titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@outraempresa.com'] },
          'admin1',
        ),
      ).rejects.toThrow('fora dos domínios permitidos');

      delete process.env.GOOGLE_CALENDAR_INVITE_ALLOWED_DOMAINS;
    });

    it('grava local antes de chamar o Google e marca ENVIADO no sucesso', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.criar(
        { titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] },
        'admin1',
      );

      expect(txMock.conviteAgendaEvento.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ modo: 'EVENTO_COM_CONVIDADOS', statusEvento: 'PENDENTE' }) }),
      );
      expect(calendarMock.criarComConvidados).toHaveBeenCalledWith('admin1', 'primary', expect.any(String), expect.objectContaining({ attendees: [{ email: 'ana@empresa.com' }] }), 'c1');
      expect(prismaMock.conviteAgendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' }, data: expect.objectContaining({ statusEvento: 'ENVIADO', eventId: 'evento-google-1' }) }),
      );
    });

    it('pede link do Google Meet por padrão', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.criar(
        { titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] },
        'admin1',
      );

      expect(txMock.conviteAgendaEvento.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ comMeet: true }) }));
      expect(calendarMock.criarComConvidados).toHaveBeenCalledWith(
        'admin1',
        'primary',
        expect.any(String),
        expect.objectContaining({ conferenceData: { createRequest: { requestId: 'c1', conferenceSolutionKey: { type: 'hangoutsMeet' } } } }),
        'c1',
      );
    });

    it('não pede Meet quando comMeet é false', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      txMock.conviteAgendaEvento.create.mockResolvedValueOnce({ ...CONVITE_NOVO, comMeet: false });

      await service.criar(
        { titulo: 'Almoço', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'], comMeet: false },
        'admin1',
      );

      expect(txMock.conviteAgendaEvento.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ comMeet: false }) }));
      const dadosEnviados = calendarMock.criarComConvidados.mock.calls[0][3];
      expect(dadosEnviados.conferenceData).toBeUndefined();
    });

    it('marca FALHA sem derrubar a criação local quando o Google recusa', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      calendarMock.criarComConvidados.mockRejectedValue(new AgendaGoogleAutorizacaoPerdida('admin1', 'invalid_grant'));

      await service.criar(
        { titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] },
        'admin1',
      );

      expect(prismaMock.conviteAgendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statusEvento: 'FALHA' }) }),
      );
    });

    it('marca FALHA em conflito de ID com outro convite', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      calendarMock.criarComConvidados.mockRejectedValue(new ConviteAgendaConflitoRemoto('ev1'));

      await service.criar(
        { titulo: 'Kickoff', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioEmails: ['ana@empresa.com'] },
        'admin1',
      );

      expect(prismaMock.conviteAgendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statusEvento: 'FALHA', ultimoErro: expect.stringContaining('ev1') }) }),
      );
    });
  });

  describe('atualizar', () => {
    it('modo novo sem envio prévio só atualiza dados locais', async () => {
      prismaMock.conviteAgendaEvento.update.mockResolvedValue({ ...CONVITE_NOVO, eventId: null, calendarId: null, destinatarios: [] });

      await service.atualizar('c1', { titulo: 'Novo título' });

      expect(calendarMock.atualizarComConvidados).not.toHaveBeenCalled();
    });

    it('modo novo já enviado reconstrói o evento e chama o Google', async () => {
      prismaMock.conviteAgendaEvento.update.mockResolvedValue({
        ...CONVITE_NOVO,
        eventId: 'ev1',
        calendarId: 'primary',
        destinatarios: [{ email: 'ana@empresa.com' }],
      });

      await service.atualizar('c1', { titulo: 'Novo título' });

      expect(calendarMock.atualizarComConvidados).toHaveBeenCalledWith('admin1', 'primary', 'ev1', expect.objectContaining({ attendees: [{ email: 'ana@empresa.com' }] }));
    });

    it('modo legado usa o fluxo por destinatário', async () => {
      prismaMock.conviteAgendaEvento.update.mockResolvedValue({
        ...CONVITE_NOVO,
        modo: 'COPIAS_INDIVIDUAIS',
        destinatarios: [{ id: 'd1', userId: 'u1', status: 'CRIADO', calendarId: 'primary', eventId: 'ev1' }],
      });
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map([['u1', { googleSub: 's1', googleEmail: 'ana@empresa.com' }]]));

      await service.atualizar('c1', { titulo: 'Novo título' });

      expect(calendarMock.criar).toHaveBeenCalledWith('u1', 'primary', expect.any(String), expect.any(Object));
    });
  });

  describe('reenviar', () => {
    it('modo novo só age quando ficou FALHA', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValueOnce({ ...CONVITE_NOVO, statusEvento: 'ENVIADO', destinatarios: [] });
      await service.reenviar('c1');
      expect(calendarMock.criarComConvidados).not.toHaveBeenCalled();
    });

    it('modo novo em FALHA repete a mesma criação', async () => {
      prismaMock.conviteAgendaEvento.findUnique
        .mockResolvedValueOnce({ ...CONVITE_NOVO, statusEvento: 'FALHA', destinatarios: [{ email: 'ana@empresa.com' }] })
        .mockResolvedValueOnce({ ...CONVITE_NOVO, statusEvento: 'ENVIADO', destinatarios: [] });

      await service.reenviar('c1');

      expect(calendarMock.criarComConvidados).toHaveBeenCalledWith('admin1', 'primary', expect.any(String), expect.any(Object), 'c1');
    });
  });

  describe('cancelar', () => {
    it('modo novo com evento enviado cancela no Google e marca CANCELADO', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValueOnce({ ...CONVITE_NOVO, eventId: 'ev1', calendarId: 'primary', destinatarios: [] });

      await service.cancelar('c1');

      expect(calendarMock.cancelarComConvidados).toHaveBeenCalledWith('admin1', 'primary', 'ev1');
      expect(prismaMock.conviteAgendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statusEvento: 'CANCELADO' }) }),
      );
    });

    it('modo novo nunca enviado só marca CANCELADO local', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValueOnce({ ...CONVITE_NOVO, eventId: null, calendarId: null, destinatarios: [] });

      await service.cancelar('c1');

      expect(calendarMock.cancelarComConvidados).not.toHaveBeenCalled();
    });
  });

  describe('sincronizarRespostas', () => {
    it('mapeia responseStatus do Google e ignora quem não apareceu na resposta', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValueOnce({ ...CONVITE_NOVO, eventId: 'ev1', calendarId: 'primary' });
      calendarMock.obterComConvidados.mockResolvedValue({
        id: 'ev1',
        attendees: [{ email: 'Ana@Empresa.com', responseStatus: 'accepted' }],
      });

      await service.sincronizarRespostas('c1');

      expect(prismaMock.conviteAgendaDestinatario.updateMany).toHaveBeenCalledWith({
        where: { conviteId: 'c1', email: 'ana@empresa.com' },
        data: { resposta: 'ACEITO', respondidoEm: expect.any(Date) },
      });
    });

    it('recusa sincronizar convite que nunca foi enviado', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValueOnce({ ...CONVITE_NOVO, eventId: null, calendarId: null });
      await expect(service.sincronizarRespostas('c1')).rejects.toThrow('ainda não tem um evento enviado');
    });
  });

  describe('remover', () => {
    it('exclui o convite', async () => {
      await service.remover('c1');
      expect(prismaMock.conviteAgendaEvento.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('rejeita convite inexistente', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValueOnce(null);
      await expect(service.remover('inexistente')).rejects.toThrow('Convite não encontrado');
      expect(prismaMock.conviteAgendaEvento.delete).not.toHaveBeenCalled();
    });
  });
});
