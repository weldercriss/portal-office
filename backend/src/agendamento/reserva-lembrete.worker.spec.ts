import { Test } from '@nestjs/testing';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservaLembreteWorker } from './reserva-lembrete.worker';

describe('ReservaLembreteWorker', () => {
  let worker: ReservaLembreteWorker;

  const prismaMock: any = {
    reserva: { findMany: jest.fn(), update: jest.fn() },
  };
  const notificacoesMock = { criar: jest.fn() };

  const reservaBase = {
    id: 'r1',
    solicitanteId: 'u1',
    responsavelId: null,
    responsavel: null,
    destinatariosNotificacao: 'SOLICITANTE',
    data: new Date('2026-09-09T00:00:00.000Z'),
    titulo: null,
    sala: { nome: 'Sala Azul' },
    solicitante: { id: 'u1', nome: 'Fulano', telegramUsername: null },
    lembrete30MinEnviado: false,
    lembreteFim30MinEnviado: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // 2026-09-09T15:00:00Z = 12:00 em America/Sao_Paulo (UTC-3, sem horário de verão).
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T15:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservaLembreteWorker,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesService, useValue: notificacoesMock },
      ],
    }).compile();
    worker = moduleRef.get(ReservaLembreteWorker);
  });

  afterEach(() => jest.useRealTimers());

  it.each([
    ['SOLICITANTE', ['u1']], ['RESPONSAVEL', ['u2']], ['AMBOS', ['u1', 'u2']],
  ])('envia lembretes de início e fim aos destinatários %s', async (destinatariosNotificacao, ids) => {
    prismaMock.reserva.findMany.mockResolvedValue([{
      ...reservaBase, horaInicio: '12:25', horaFim: '12:35', responsavelId: 'u2',
      responsavel: { id: 'u2', nome: 'Bia', telegramUsername: null }, destinatariosNotificacao,
    }]);
    await worker.avisarProximas();
    for (const tipo of ['RESERVA_SALA_LEMBRETE', 'RESERVA_SALA_LEMBRETE_FIM']) {
      const chamadas = notificacoesMock.criar.mock.calls.filter(([input]) => input.tipo === tipo);
      expect(chamadas.map(([input]) => input.userId)).toEqual(ids);
      expect(chamadas.filter(([input]) => input.telegramGrupoTexto)).toHaveLength(1);
    }
  });

  it('não duplica lembrete para uma pessoa nos dois papéis', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([{
      ...reservaBase, horaInicio: '12:30', horaFim: '13:30', responsavelId: 'u1', destinatariosNotificacao: 'AMBOS',
    }]);
    await worker.avisarProximas();
    expect(notificacoesMock.criar).toHaveBeenCalledTimes(1);
  });

  it('avisa 30 minutos antes do início e marca o flag pra não repetir', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([{ ...reservaBase, horaInicio: '12:30', horaFim: '13:30' }]);

    await worker.avisarProximas();

    expect(notificacoesMock.criar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'RESERVA_SALA_LEMBRETE', userId: 'u1' }),
    );
    expect(prismaMock.reserva.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { lembrete30MinEnviado: true },
    });
  });

  it('avisa 30 minutos antes do fim, com um texto de grupo que linka o portal', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([{ ...reservaBase, horaInicio: '11:00', horaFim: '12:30' }]);

    await worker.avisarProximas();

    expect(notificacoesMock.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'RESERVA_SALA_LEMBRETE_FIM',
        telegramGrupoTexto: expect.stringContaining('Ver Agendamento'),
      }),
    );
    expect(prismaMock.reserva.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { lembreteFim30MinEnviado: true },
    });
  });

  it('não repete um lembrete de início já marcado como enviado', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([
      { ...reservaBase, horaInicio: '12:30', horaFim: '13:30', lembrete30MinEnviado: true },
    ]);

    await worker.avisarProximas();

    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });

  it('ignora reserva fora da janela de 25–35 minutos', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([{ ...reservaBase, horaInicio: '14:00', horaFim: '15:00' }]);

    await worker.avisarProximas();

    expect(notificacoesMock.criar).not.toHaveBeenCalled();
  });
});
