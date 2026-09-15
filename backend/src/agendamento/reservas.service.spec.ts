import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReservaDestinatarios } from '@prisma/client';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgendamentoGateway } from './agendamento.gateway';
import { ReservasAgendaService } from './reservas-agenda.service';
import { ReservasService } from './reservas.service';

// 2026-09-09 é uma quarta-feira (3).
const QUARTA = '2026-09-09';

describe('ReservasService', () => {
  let service: ReservasService;

  const prismaMock: any = {
    reserva: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    sala: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const notificacoesMock = { criar: jest.fn(), criarParaAdmins: jest.fn() };
  const agendaMock = { enfileirar: jest.fn().mockResolvedValue(undefined) };
  const gatewayMock = { avisarMudancaDeReserva: jest.fn() };

  const novaReserva = {
    salaId: 'sala1',
    solicitanteId: 'u1',
    data: QUARTA,
    horaInicio: '10:00',
    horaFim: '11:00',
  };

  const reservaCriada = {
    id: 'r1',
    salaId: 'sala1',
    solicitanteId: 'u1',
    responsavelId: null,
    responsavel: null,
    destinatariosNotificacao: 'SOLICITANTE',
    data: new Date(`${QUARTA}T00:00:00.000Z`),
    horaInicio: '10:00',
    horaFim: '11:00',
    status: 'CONFIRMADA',
    titulo: null,
    sala: { id: 'sala1', nome: 'Sala Azul' },
    solicitante: { id: 'u1', nome: 'Fulano', telegramUsername: null },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // 06:00 em America/Sao_Paulo — bem antes do horaInicio (10:00) das reservas de teste.
    jest.useFakeTimers().setSystemTime(new Date(`${QUARTA}T09:00:00.000Z`));
    prismaMock.sala.findUnique.mockResolvedValue({
      id: 'sala1',
      ativo: true,
      disponibilidades: [{ diaSemana: 3, horaInicio: '09:00', horaFim: '18:00', duracaoMinutos: 60 }],
    });
    prismaMock.user.findUnique.mockResolvedValue({ ativo: true });
    prismaMock.reserva.findFirst.mockResolvedValue(null);
    prismaMock.reserva.create.mockResolvedValue(reservaCriada);
    prismaMock.reserva.update.mockResolvedValue(reservaCriada);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReservasService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacoesService, useValue: notificacoesMock },
        { provide: ReservasAgendaService, useValue: agendaMock },
        { provide: AgendamentoGateway, useValue: gatewayMock },
      ],
    }).compile();
    service = moduleRef.get(ReservasService);
  });

  afterEach(() => jest.useRealTimers());

  describe('responsável e destinatários', () => {
    const responsavel = { id: 'u2', nome: 'Bia', telegramUsername: 'bia' };

    it.each([
      [ReservaDestinatarios.SOLICITANTE, ['u1']],
      [ReservaDestinatarios.RESPONSAVEL, ['u2']],
      [ReservaDestinatarios.AMBOS, ['u1', 'u2']],
    ])('cria e notifica somente os destinatários de %s', async (destinatariosNotificacao, ids) => {
      prismaMock.reserva.create.mockResolvedValue({ ...reservaCriada, responsavelId: 'u2', responsavel, destinatariosNotificacao });
      await service.create({ ...novaReserva, responsavelId: 'u2', destinatariosNotificacao }, 'admin1');
      expect(prismaMock.reserva.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ responsavelId: 'u2', destinatariosNotificacao }),
      }));
      expect(notificacoesMock.criar.mock.calls.map(([input]) => input.userId)).toEqual(ids);
      expect(notificacoesMock.criar.mock.calls.filter(([input]) => input.telegramGrupoTexto)).toHaveLength(1);
    });

    it('não duplica o aviso se solicitante e responsável forem a mesma pessoa', async () => {
      prismaMock.reserva.create.mockResolvedValue({ ...reservaCriada, responsavelId: 'u1', destinatariosNotificacao: 'AMBOS' });
      await service.create({ ...novaReserva, responsavelId: 'u1', destinatariosNotificacao: ReservaDestinatarios.AMBOS }, 'admin1');
      expect(notificacoesMock.criar).toHaveBeenCalledTimes(1);
    });

    it.each([null, { ativo: false }])('recusa responsável inexistente ou inativo (%j)', async (user) => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ ativo: true }).mockResolvedValueOnce(user);
      await expect(service.create({ ...novaReserva, responsavelId: 'u2' }, 'admin1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.reserva.create).not.toHaveBeenCalled();
    });

    it.each([ReservaDestinatarios.RESPONSAVEL, ReservaDestinatarios.AMBOS])('exige responsável para %s', async (destinatariosNotificacao) => {
      await expect(service.create({ ...novaReserva, destinatariosNotificacao }, 'admin1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.reserva.create).not.toHaveBeenCalled();
    });

    it.each(['RESERVA_SALA_CONFIRMADA', 'RESERVA_SALA_CANCELADA', 'RESERVA_SALA_ATUALIZADA'])('respeita responsável exclusivo em %s', async (tipo) => {
      const atual = { ...reservaCriada, status: 'SOLICITADA', responsavelId: 'u2', responsavel, destinatariosNotificacao: 'RESPONSAVEL' };
      prismaMock.reserva.findUnique.mockResolvedValue(atual);
      prismaMock.reserva.update.mockResolvedValue(atual);
      if (tipo === 'RESERVA_SALA_CANCELADA') await service.cancelar('r1');
      else if (tipo === 'RESERVA_SALA_CONFIRMADA') await service.update('r1', { status: 'CONFIRMADA' });
      else await service.update('r1', { horaFim: '12:00' });
      expect(notificacoesMock.criar).toHaveBeenCalledTimes(1);
      expect(notificacoesMock.criar).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2', tipo }));
    });

    it('permite remover o responsável voltando os avisos para o solicitante', async () => {
      prismaMock.reserva.findUnique.mockResolvedValue({ ...reservaCriada, responsavelId: 'u2', destinatariosNotificacao: 'AMBOS' });
      await service.update('r1', { responsavelId: null, destinatariosNotificacao: ReservaDestinatarios.SOLICITANTE });
      expect(prismaMock.reserva.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ responsavelId: null, destinatariosNotificacao: 'SOLICITANTE' }),
      }));
    });

    it('recusa remover o responsável sem ajustar os destinatários', async () => {
      prismaMock.reserva.findUnique.mockResolvedValue({ ...reservaCriada, responsavelId: 'u2', destinatariosNotificacao: 'AMBOS' });
      await expect(service.update('r1', { responsavelId: null })).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.reserva.update).not.toHaveBeenCalled();
    });

    it('inclui as reservas sob responsabilidade na consulta pessoal', () => {
      service.findAll({ participanteId: 'u2' });
      expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ OR: [{ solicitanteId: 'u2' }, { responsavelId: 'u2' }] }),
      }));
    });
  });

  describe('create', () => {
    it('registra a reserva, avisa o solicitante e enfileira a agenda', async () => {
      await service.create(novaReserva as any, 'admin1');

      expect(prismaMock.reserva.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CONFIRMADA', registradoPorId: 'admin1' }),
        }),
      );
      expect(notificacoesMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', tipo: 'RESERVA_SALA_CRIADA' }),
      );
      expect(agendaMock.enfileirar).toHaveBeenCalledWith(['r1']);
    });

    it('guarda a data como meia-noite UTC, sem depender do fuso do servidor', async () => {
      await service.create(novaReserva as any, 'admin1');
      const gravado = prismaMock.reserva.create.mock.calls[0][0].data;
      expect(gravado.data.toISOString()).toBe(`${QUARTA}T00:00:00.000Z`);
    });

    it('aceita reserva de várias horas, desde que caiba no horário comercial', async () => {
      await service.create({ ...novaReserva, horaInicio: '09:00', horaFim: '18:00' } as any, 'admin1');
      expect(prismaMock.reserva.create).toHaveBeenCalled();
    });

    it('aceita horário quebrado, sem prender a reserva aos blocos da grade', async () => {
      await service.create({ ...novaReserva, horaInicio: '09:20', horaFim: '10:50' } as any, 'admin1');
      expect(prismaMock.reserva.create).toHaveBeenCalled();
    });

    it('recusa horário final antes do inicial', async () => {
      await expect(
        service.create({ ...novaReserva, horaInicio: '11:00', horaFim: '10:00' } as any, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.reserva.create).not.toHaveBeenCalled();
    });

    it('recusa horário fora da disponibilidade da sala', async () => {
      await expect(
        service.create({ ...novaReserva, horaInicio: '19:00', horaFim: '20:00' } as any, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.reserva.create).not.toHaveBeenCalled();
    });

    it('recusa dia da semana sem disponibilidade cadastrada', async () => {
      // 2026-09-10 é quinta-feira e a sala só abre na quarta.
      await expect(service.create({ ...novaReserva, data: '2026-09-10' } as any, 'admin1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('recusa sala inativa', async () => {
      prismaMock.sala.findUnique.mockResolvedValue({ id: 'sala1', ativo: false, disponibilidades: [] });
      await expect(service.create(novaReserva as any, 'admin1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa sala inexistente', async () => {
      prismaMock.sala.findUnique.mockResolvedValue(null);
      await expect(service.create(novaReserva as any, 'admin1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('recusa horário já tomado por outra reserva viva', async () => {
      prismaMock.reserva.findFirst.mockResolvedValue({ horaInicio: '10:00', horaFim: '11:00' });
      await expect(service.create(novaReserva as any, 'admin1')).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.reserva.create).not.toHaveBeenCalled();
    });

    it('procura conflito só entre reservas que ainda ocupam o horário', async () => {
      await service.create(novaReserva as any, 'admin1');
      expect(prismaMock.reserva.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['SOLICITADA', 'CONFIRMADA'] },
            horaInicio: { lt: '11:00' },
            horaFim: { gt: '10:00' },
          }),
        }),
      );
    });

    it('recusa solicitante inativo', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ativo: false });
      await expect(service.create(novaReserva as any, 'admin1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa criar uma reserva já cancelada', async () => {
      await expect(service.create({ ...novaReserva, status: 'CANCELADA' } as any, 'admin1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('recusa criar uma reserva com horário que já passou', async () => {
      jest.setSystemTime(new Date(`${QUARTA}T13:01:00.000Z`)); // 10:01 local, passou do horaInicio (10:00)
      await expect(service.create(novaReserva as any, 'admin1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.reserva.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prismaMock.reserva.findUnique.mockResolvedValue(reservaCriada);
    });

    it('não revalida o horário quando só muda o título', async () => {
      await service.update('r1', { titulo: 'Reunião de squad' } as any);
      expect(prismaMock.reserva.findFirst).not.toHaveBeenCalled();
    });

    it('revalida o horário deixando a própria reserva de fora da checagem', async () => {
      await service.update('r1', { horaInicio: '14:00', horaFim: '15:00' } as any);
      expect(prismaMock.reserva.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: 'r1' } }) }),
      );
    });

    it('cancelar libera o horário, guarda a data e avisa o solicitante', async () => {
      prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'CANCELADA' });
      await service.cancelar('r1', 'Sala em manutenção');

      const gravado = prismaMock.reserva.update.mock.calls[0][0].data;
      expect(gravado.status).toBe('CANCELADA');
      expect(gravado.canceladoEm).toBeInstanceOf(Date);
      expect(gravado.motivoCancelamento).toBe('Sala em manutenção');
      expect(notificacoesMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'RESERVA_SALA_CANCELADA' }),
      );
      expect(agendaMock.enfileirar).toHaveBeenCalledWith(['r1']);
    });

    it('cancelar não revalida disponibilidade: o horário está sendo liberado', async () => {
      prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'CANCELADA' });
      await service.cancelar('r1');
      expect(prismaMock.reserva.findFirst).not.toHaveBeenCalled();
    });

    it('falha quando a reserva não existe', async () => {
      prismaMock.reserva.findUnique.mockResolvedValue(null);
      await expect(service.update('inexistente', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('confirmar uma reserva solicitada avisa com o tipo de confirmação', async () => {
      prismaMock.reserva.findUnique.mockResolvedValue({ ...reservaCriada, status: 'SOLICITADA' });
      prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'CONFIRMADA' });

      await service.update('r1', { status: 'CONFIRMADA' } as any);

      expect(notificacoesMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'RESERVA_SALA_CONFIRMADA' }),
      );
    });

    it('avisa a mudança em tempo real para quem está olhando a tela', async () => {
      await service.update('r1', { titulo: 'Nova sala' } as any);
      expect(gatewayMock.avisarMudancaDeReserva).toHaveBeenCalled();
    });

    it('não manda Telegram quando o solicitante optou por não ser avisado', async () => {
      prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'CANCELADA', notificarTelegram: false });
      await service.cancelar('r1');

      expect(notificacoesMock.criar).toHaveBeenCalledWith(expect.objectContaining({ enviarTelegram: false }));
    });

    describe('regra: reserva já começada só é editável para cancelar', () => {
      it('bloqueia qualquer edição de reserva já cancelada — inclusive tentar cancelar de novo', async () => {
        prismaMock.reserva.findUnique.mockResolvedValue({ ...reservaCriada, status: 'CANCELADA' });

        await expect(service.update('r1', { titulo: 'Novo' } as any)).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.update('r1', { status: 'CANCELADA' } as any)).rejects.toBeInstanceOf(BadRequestException);
        expect(prismaMock.reserva.update).not.toHaveBeenCalled();
      });

      it('bloqueia qualquer edição — inclusive cancelar — de reserva já finalizada', async () => {
        jest.setSystemTime(new Date(`${QUARTA}T14:01:00.000Z`)); // 11:01 local, passou do horaFim (11:00)

        await expect(service.update('r1', { titulo: 'Novo' } as any)).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          service.update('r1', { status: 'CANCELADA', motivoCancelamento: 'tarde demais' } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prismaMock.reserva.update).not.toHaveBeenCalled();
      });

      it('bloqueia editar outros campos de reserva em andamento', async () => {
        jest.setSystemTime(new Date(`${QUARTA}T13:30:00.000Z`)); // 10:30 local, entre início e fim

        await expect(service.update('r1', { titulo: 'Novo' } as any)).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.update('r1', { horaFim: '12:00' } as any)).rejects.toBeInstanceOf(BadRequestException);
        expect(prismaMock.reserva.update).not.toHaveBeenCalled();
      });

      it('permite cancelar uma reserva em andamento', async () => {
        jest.setSystemTime(new Date(`${QUARTA}T13:30:00.000Z`));
        prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'CANCELADA' });

        await service.update('r1', { status: 'CANCELADA', motivoCancelamento: 'imprevisto' } as any);

        expect(prismaMock.reserva.update).toHaveBeenCalled();
        expect(notificacoesMock.criar).toHaveBeenCalledWith(
          expect.objectContaining({ tipo: 'RESERVA_SALA_CANCELADA' }),
        );
      });

      it('deixa editar uma reserva solicitada à vontade, mesmo com o horário já passado', async () => {
        jest.setSystemTime(new Date(`${QUARTA}T14:30:00.000Z`)); // 11:30 local, bem depois do horaFim (11:00)
        prismaMock.reserva.findUnique.mockResolvedValue({ ...reservaCriada, status: 'SOLICITADA' });
        prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'SOLICITADA', titulo: 'Novo' });

        await service.update('r1', { titulo: 'Novo' } as any);

        expect(prismaMock.reserva.update).toHaveBeenCalled();
      });

      it('deixa confirmar uma reserva solicitada mesmo já em andamento', async () => {
        jest.setSystemTime(new Date(`${QUARTA}T13:30:00.000Z`)); // 10:30 local, entre início e fim
        prismaMock.reserva.findUnique.mockResolvedValue({ ...reservaCriada, status: 'SOLICITADA' });
        prismaMock.reserva.update.mockResolvedValue({ ...reservaCriada, status: 'CONFIRMADA' });

        await service.update('r1', { status: 'CONFIRMADA' } as any);

        expect(notificacoesMock.criar).toHaveBeenCalledWith(
          expect.objectContaining({ tipo: 'RESERVA_SALA_CONFIRMADA' }),
        );
      });
    });
  });

  describe('remove', () => {
    it('enfileira a agenda depois de excluir, para o evento remoto ainda sair', async () => {
      prismaMock.reserva.findUnique.mockResolvedValue(reservaCriada);
      await service.remove('r1');

      expect(prismaMock.reserva.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
      expect(agendaMock.enfileirar).toHaveBeenCalledWith(['r1']);
      expect(gatewayMock.avisarMudancaDeReserva).toHaveBeenCalled();
    });
  });
});
