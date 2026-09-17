import { ConviteAgendaConflitoRemoto, GoogleCalendarClient } from './google-calendar.client';

function erroHttp(statusCode: number) {
  return { response: { status: statusCode } };
}

describe('GoogleCalendarClient — convites por e-mail', () => {
  const requestMock = jest.fn();
  const oauthMock = {
    clienteAutorizado: jest.fn(),
    marcarReconexao: jest.fn(),
  };

  let client: GoogleCalendarClient;

  beforeEach(() => {
    jest.clearAllMocks();
    oauthMock.clienteAutorizado.mockResolvedValue({ cliente: { request: requestMock }, googleSub: 's1', googleEmail: 'organizador@empresa.com' });
    client = new GoogleCalendarClient(oauthMock as never);
  });

  describe('criarComConvidados', () => {
    const evento = {
      summary: 'Kickoff',
      start: { dateTime: '2026-10-01T14:00:00.000Z' },
      end: { dateTime: '2026-10-01T15:00:00.000Z' },
      attendees: [{ email: 'ana@empresa.com' }],
    };

    it('cria com sendUpdates=all e devolve o id', async () => {
      requestMock.mockResolvedValueOnce({ data: { id: 'ev1' } });

      const id = await client.criarComConvidados('organizador1', 'primary', 'ev1', evento, 'convite1');

      expect(id).toBe('ev1');
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', params: { sendUpdates: 'all' }, data: expect.objectContaining({ id: 'ev1', attendees: evento.attendees }) }),
      );
    });

    it('em 409 do mesmo convite, atualiza em vez de criar outro', async () => {
      requestMock
        .mockRejectedValueOnce(erroHttp(409))
        .mockResolvedValueOnce({ data: { id: 'ev1', attendees: [], extendedProperties: { private: { conviteAgendaId: 'convite1' } } } })
        .mockResolvedValueOnce({ data: {} });

      const id = await client.criarComConvidados('organizador1', 'primary', 'ev1', evento, 'convite1');

      expect(id).toBe('ev1');
      expect(requestMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ method: 'PATCH', params: { sendUpdates: 'all' } }),
      );
    });

    it('em 409 de outro convite, recusa sobrescrever', async () => {
      requestMock
        .mockRejectedValueOnce(erroHttp(409))
        .mockResolvedValueOnce({ data: { id: 'ev1', attendees: [], extendedProperties: { private: { conviteAgendaId: 'outro-convite' } } } });

      await expect(client.criarComConvidados('organizador1', 'primary', 'ev1', evento, 'convite1')).rejects.toBeInstanceOf(
        ConviteAgendaConflitoRemoto,
      );
    });
  });

  describe('atualizarComConvidados / cancelarComConvidados', () => {
    it('atualizar envia sendUpdates=all e retorna false quando o evento sumiu', async () => {
      requestMock.mockRejectedValueOnce(erroHttp(404));

      const resultado = await client.atualizarComConvidados('organizador1', 'primary', 'ev1', {
        summary: 'Kickoff',
        start: { dateTime: '2026-10-01T14:00:00.000Z' },
        end: { dateTime: '2026-10-01T15:00:00.000Z' },
      });

      expect(resultado).toBe(false);
    });

    it('cancelar trata 404/410 como sucesso idempotente', async () => {
      requestMock.mockRejectedValueOnce(erroHttp(410));
      await expect(client.cancelarComConvidados('organizador1', 'primary', 'ev1')).resolves.toBeUndefined();
      expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', params: { sendUpdates: 'all' } }));
    });
  });

  describe('obterComConvidados', () => {
    it('retorna null quando o evento não existe mais', async () => {
      requestMock.mockRejectedValueOnce(erroHttp(404));
      await expect(client.obterComConvidados('organizador1', 'primary', 'ev1')).resolves.toBeNull();
    });

    it('devolve os attendees do evento', async () => {
      requestMock.mockResolvedValueOnce({ data: { id: 'ev1', attendees: [{ email: 'ana@empresa.com', responseStatus: 'accepted' }] } });
      const evento = await client.obterComConvidados('organizador1', 'primary', 'ev1');
      expect(evento?.attendees).toEqual([{ email: 'ana@empresa.com', responseStatus: 'accepted' }]);
    });
  });

  describe('consultarLivreOcupado', () => {
    it('mapeia livre, ocupado e desconhecido por e-mail', async () => {
      requestMock.mockResolvedValueOnce({
        data: {
          calendars: {
            'ana@empresa.com': { busy: [{ start: '2026-10-01T14:00:00Z', end: '2026-10-01T14:30:00Z' }] },
            'bia@empresa.com': { busy: [] },
            'carlos@empresa.com': { errors: [{ reason: 'notFound' }] },
          },
        },
      });

      const resultado = await client.consultarLivreOcupado('organizador1', ['ana@empresa.com', 'bia@empresa.com', 'carlos@empresa.com'], 'i', 'f');

      expect(resultado).toEqual([
        { email: 'ana@empresa.com', status: 'OCUPADO', ocupado: [{ inicio: '2026-10-01T14:00:00Z', fim: '2026-10-01T14:30:00Z' }] },
        { email: 'bia@empresa.com', status: 'LIVRE', ocupado: [] },
        { email: 'carlos@empresa.com', status: 'DESCONHECIDO', ocupado: [] },
      ]);
    });

    it('uma falha no lote vira DESCONHECIDO para todo o lote, sem lançar', async () => {
      requestMock.mockRejectedValueOnce(erroHttp(403));
      const resultado = await client.consultarLivreOcupado('organizador1', ['ana@empresa.com'], 'i', 'f');
      expect(resultado).toEqual([{ email: 'ana@empresa.com', status: 'DESCONHECIDO', ocupado: [] }]);
    });

    it('divide mais de 50 e-mails em lotes', async () => {
      const emails = Array.from({ length: 60 }, (_, i) => `pessoa${i}@empresa.com`);
      requestMock.mockResolvedValue({ data: { calendars: {} } });

      await client.consultarLivreOcupado('organizador1', emails, 'i', 'f');

      expect(requestMock).toHaveBeenCalledTimes(2);
      expect(requestMock.mock.calls[0][0].data.items).toHaveLength(50);
      expect(requestMock.mock.calls[1][0].data.items).toHaveLength(10);
    });
  });
});
