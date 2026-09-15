import { AgendaGoogleAutorizacaoPerdida } from '../agenda-google/agenda-google-oauth.service';
import { ConvitesAgendaService } from './convites-agenda.service';

describe('ConvitesAgendaService', () => {
  const prismaMock = {
    user: { findMany: jest.fn() },
    conviteAgendaEvento: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    conviteAgendaDestinatario: { upsert: jest.fn(), update: jest.fn() },
  };
  const calendarMock = { criar: jest.fn(), remover: jest.fn(), listarNoIntervalo: jest.fn() };
  const agendaGoogleMock = { conexoesUtilizaveis: jest.fn() };

  const CONVITE = {
    id: 'c1',
    titulo: 'Kickoff Q4',
    descricao: null,
    local: null,
    inicio: new Date('2026-10-01T14:00:00.000Z'),
    fim: new Date('2026-10-01T15:00:00.000Z'),
    criadoPorId: 'admin1',
    criadoEm: new Date(),
  };

  let service: ConvitesAgendaService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.conviteAgendaEvento.create.mockResolvedValue(CONVITE);
    prismaMock.conviteAgendaEvento.findUnique.mockResolvedValue({ ...CONVITE, destinatarios: [] });
    calendarMock.criar.mockResolvedValue('evento-google-1');
    service = new ConvitesAgendaService(prismaMock as never, calendarMock as never, agendaGoogleMock as never);
  });

  describe('colaboradores', () => {
    it('marca como indisponível quem não tem conexão utilizável', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'u1', nome: 'Ana', email: 'ana@empresa.com' },
        { id: 'u2', nome: 'Bruno', email: 'bruno@empresa.com' },
      ]);
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map([['u1', { googleSub: 's1', googleEmail: 'ana@empresa.com' }]]));

      const resultado = await service.colaboradores();

      expect(resultado).toEqual([
        { id: 'u1', nome: 'Ana', email: 'ana@empresa.com', disponivel: true },
        { id: 'u2', nome: 'Bruno', email: 'bruno@empresa.com', disponivel: false },
      ]);
    });
  });

  describe('verificar', () => {
    it('rejeita intervalo com fim antes do início', async () => {
      await expect(
        service.verificar({ inicio: '2026-10-01T15:00:00.000Z', fim: '2026-10-01T14:00:00.000Z', destinatarioIds: ['u1'] }),
      ).rejects.toThrow('O fim do evento precisa ser depois do início.');
    });

    it('não chama o Google para quem está indisponível', async () => {
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map());

      const resultado = await service.verificar({
        inicio: '2026-10-01T14:00:00.000Z',
        fim: '2026-10-01T15:00:00.000Z',
        destinatarioIds: ['u1'],
      });

      expect(resultado).toEqual([{ userId: 'u1', disponivel: false, conflitos: [] }]);
      expect(calendarMock.listarNoIntervalo).not.toHaveBeenCalled();
    });

    it('mostra a divergência quando já existe evento no intervalo', async () => {
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map([['u1', { googleSub: 's1', googleEmail: 'ana@empresa.com' }]]));
      calendarMock.listarNoIntervalo.mockResolvedValue([
        { id: 'ev1', summary: 'Reunião de time', start: { dateTime: '2026-10-01T14:00:00-03:00' }, end: { dateTime: '2026-10-01T15:00:00-03:00' } },
      ]);

      const [resultado] = await service.verificar({
        inicio: '2026-10-01T14:00:00.000Z',
        fim: '2026-10-01T15:00:00.000Z',
        destinatarioIds: ['u1'],
      });

      expect(resultado).toMatchObject({ userId: 'u1', disponivel: true });
      expect(resultado.conflitos).toEqual([
        { titulo: 'Reunião de time', inicio: '2026-10-01T14:00:00-03:00', fim: '2026-10-01T15:00:00-03:00' },
      ]);
    });
  });

  describe('criar', () => {
    it('marca indisponível quem não tem conexão, sem chamar o Google', async () => {
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map());

      await service.criar(
        { titulo: 'Kickoff Q4', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioIds: ['u1'] },
        'admin1',
      );

      expect(calendarMock.criar).not.toHaveBeenCalled();
      expect(prismaMock.conviteAgendaDestinatario.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ status: 'INDISPONIVEL' }) }),
      );
    });

    it('cria o evento e guarda o vínculo para quem está conectado', async () => {
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map([['u1', { googleSub: 's1', googleEmail: 'ana@empresa.com' }]]));

      await service.criar(
        { titulo: 'Kickoff Q4', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioIds: ['u1'] },
        'admin1',
      );

      expect(calendarMock.criar).toHaveBeenCalledWith('u1', 'primary', expect.any(String), expect.objectContaining({ summary: 'Kickoff Q4' }));
      expect(prismaMock.conviteAgendaDestinatario.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ status: 'CRIADO', eventId: 'evento-google-1' }) }),
      );
    });

    it('marca falha sem derrubar a criação do convite quando o Google recusa', async () => {
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map([['u1', { googleSub: 's1', googleEmail: 'ana@empresa.com' }]]));
      calendarMock.criar.mockRejectedValue(new AgendaGoogleAutorizacaoPerdida('u1', 'invalid_grant'));

      await service.criar(
        { titulo: 'Kickoff Q4', inicio: '2026-10-01T14:00:00.000Z', fim: '2026-10-01T15:00:00.000Z', destinatarioIds: ['u1'] },
        'admin1',
      );

      expect(prismaMock.conviteAgendaDestinatario.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ status: 'FALHA', erro: 'invalid_grant' }) }),
      );
    });
  });

  describe('atualizar', () => {
    it('rejeita intervalo com fim antes do início', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValue({ ...CONVITE, destinatarios: [] });

      await expect(
        service.atualizar('c1', { inicio: '2026-10-01T15:00:00.000Z', fim: '2026-10-01T14:00:00.000Z' }),
      ).rejects.toThrow('O fim do evento precisa ser depois do início.');
      expect(prismaMock.conviteAgendaEvento.update).not.toHaveBeenCalled();
    });

    it('reflete a mudança em quem já tinha o evento, sem mexer em quem foi cancelado', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValue({
        ...CONVITE,
        destinatarios: [
          { id: 'd1', userId: 'u1', status: 'CRIADO', calendarId: 'primary', eventId: 'ev1' },
          { id: 'd2', userId: 'u2', status: 'CANCELADO', calendarId: null, eventId: null },
        ],
      });
      prismaMock.conviteAgendaEvento.update.mockResolvedValue({ ...CONVITE, titulo: 'Kickoff Q4 (novo local)' });
      agendaGoogleMock.conexoesUtilizaveis.mockResolvedValue(new Map([['u1', { googleSub: 's1', googleEmail: 'ana@empresa.com' }]]));

      await service.atualizar('c1', { titulo: 'Kickoff Q4 (novo local)' });

      expect(prismaMock.conviteAgendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' }, data: expect.objectContaining({ titulo: 'Kickoff Q4 (novo local)' }) }),
      );
      expect(agendaGoogleMock.conexoesUtilizaveis).toHaveBeenCalledWith(['u1']);
      expect(calendarMock.criar).toHaveBeenCalledWith('u1', 'primary', expect.any(String), expect.objectContaining({ summary: 'Kickoff Q4 (novo local)' }));
    });
  });

  describe('cancelar', () => {
    it('remove só quem já tinha recebido o evento', async () => {
      prismaMock.conviteAgendaEvento.findUnique.mockResolvedValue({
        ...CONVITE,
        destinatarios: [
          { id: 'd1', userId: 'u1', status: 'CRIADO', calendarId: 'primary', eventId: 'ev1' },
          { id: 'd2', userId: 'u2', status: 'INDISPONIVEL', calendarId: null, eventId: null },
        ],
      });

      await service.cancelar('c1');

      expect(calendarMock.remover).toHaveBeenCalledWith('u1', 'primary', 'ev1');
      expect(calendarMock.remover).toHaveBeenCalledTimes(1);
      expect(prismaMock.conviteAgendaDestinatario.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: 'CANCELADO' },
      });
    });
  });
});
