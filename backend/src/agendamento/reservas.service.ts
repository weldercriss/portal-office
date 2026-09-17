import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReservaDestinatarios, ReservaStatus } from '@prisma/client';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgendamentoGateway } from './agendamento.gateway';
import { AgendamentoConfigService } from './agendamento-config.service';
import { dataUtc, dentroDaDisponibilidade, emMinutos } from './disponibilidade.util';
import { CreateReservaDto, UpdateReservaDto } from './dto/reserva.dto';
import { CreateReservaColaboradorDto } from './dto/reserva-colaborador.dto';
import { estadoTemporalReserva } from './reserva-instante.util';
import { destinatariosReserva, DestinatariosReserva } from './reserva-destinatarios.util';
import { formatarDataBr, textoGrupoReserva } from './reserva-telegram.util';
import { ReservasAgendaService } from './reservas-agenda.service';
import { STATUS_QUE_OCUPAM } from './salas.service';

const RESERVA_INCLUDE = {
  sala: { select: { id: true, nome: true, localizacao: true } },
  solicitante: { select: { id: true, nome: true, email: true, telegramUsername: true } },
  responsavel: { select: { id: true, nome: true, email: true, telegramUsername: true } },
  registradoPor: { select: { id: true, nome: true } },
} as const satisfies Prisma.ReservaInclude;

export interface FiltrosReserva {
  salaId?: string;
  solicitanteId?: string;
  participanteId?: string;
  status?: string;
  from?: string;
  to?: string;
}

/** Campos que definem o horário ocupado: mudar qualquer um exige revalidar. */
interface Horario {
  salaId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
}

function dia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Status vindo da query: valor desconhecido vira filtro nenhum, não erro 500. */
function statusValido(valor: string | undefined): ReservaStatus | undefined {
  return valor && valor in ReservaStatus ? (valor as ReservaStatus) : undefined;
}

@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly agenda: ReservasAgendaService,
    private readonly agendamentoGateway: AgendamentoGateway,
    private readonly configService: AgendamentoConfigService,
  ) {}

  findAll(filtros: FiltrosReserva) {
    return this.prisma.reserva.findMany({
      where: {
        salaId: filtros.salaId,
        solicitanteId: filtros.solicitanteId,
        OR: filtros.participanteId ? [{ solicitanteId: filtros.participanteId }, { responsavelId: filtros.participanteId }] : undefined,
        status: statusValido(filtros.status),
        data: {
          gte: filtros.from ? dataUtc(filtros.from) : undefined,
          lte: filtros.to ? dataUtc(filtros.to) : undefined,
        },
      },
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
      include: RESERVA_INCLUDE,
    });
  }

  async findOne(id: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id }, include: RESERVA_INCLUDE });
    if (!reserva) throw new NotFoundException('Reserva não encontrada');
    return reserva;
  }

  async create(dto: CreateReservaDto, registradoPorId: string) {
    return this.criar(dto, registradoPorId);
  }

  async createSolicitacao(dto: CreateReservaColaboradorDto, userId: string) {
    if (!(await this.configService.permiteSolicitacaoColaborador())) {
      throw new ForbiddenException('A solicitação de salas por colaboradores está desabilitada');
    }

    return this.criar(
      {
        ...dto,
        solicitanteId: userId,
        responsavelId: null,
        destinatariosNotificacao: ReservaDestinatarios.SOLICITANTE,
        status: ReservaStatus.SOLICITADA,
      },
      userId,
    );
  }

  private async criar(dto: CreateReservaDto, registradoPorId: string) {
    if (dto.status === ReservaStatus.CANCELADA) {
      throw new BadRequestException('Uma reserva não pode ser criada já cancelada');
    }
    if (estadoTemporalReserva({ data: dataUtc(dto.data), horaInicio: dto.horaInicio, horaFim: dto.horaFim }) !== 'FUTURA') {
      throw new BadRequestException('Não é possível criar uma reserva para um horário que já passou.');
    }

    const horario: Horario = {
      salaId: dto.salaId,
      data: dto.data,
      horaInicio: dto.horaInicio,
      horaFim: dto.horaFim,
    };
    await this.validarHorario(horario);
    await this.garantirSolicitanteAtivo(dto.solicitanteId);
    await this.garantirResponsavelAtivo(dto.responsavelId);
    this.validarDestinatarios(dto.responsavelId, dto.destinatariosNotificacao ?? ReservaDestinatarios.SOLICITANTE);

    const reserva = await this.prisma.reserva.create({
      data: {
        salaId: dto.salaId,
        solicitanteId: dto.solicitanteId,
        responsavelId: dto.responsavelId,
        destinatariosNotificacao: dto.destinatariosNotificacao,
        data: dataUtc(dto.data),
        horaInicio: dto.horaInicio,
        horaFim: dto.horaFim,
        titulo: dto.titulo?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
        status: dto.status ?? ReservaStatus.CONFIRMADA,
        notificarTelegram: dto.notificarTelegram,
        registradoPorId,
      },
      include: RESERVA_INCLUDE,
    });

    if (reserva.status === ReservaStatus.SOLICITADA) {
      await this.avisarDestinatarios(reserva, 'RESERVA_SALA_SOLICITADA', 'Solicitação de sala enviada');
      await this.notificacoesService.criarParaAdmins({
        tipo: 'RESERVA_SALA_SOLICITADA',
        titulo: 'Nova solicitação de sala',
        mensagem: `${reserva.solicitante.nome} solicitou ${reserva.sala.nome} em ${formatarDataBr(reserva.data)}, ${reserva.horaInicio} às ${reserva.horaFim}`,
        link: '/agendamentos',
      });
    } else {
      await this.avisarDestinatarios(reserva, 'RESERVA_SALA_CRIADA', 'Sala reservada');
      await this.agenda.enfileirar([reserva.id]);
    }
    this.agendamentoGateway.avisarMudancaDeReserva();
    return reserva;
  }

  async update(id: string, dto: UpdateReservaDto) {
    const atual = await this.findOne(id);
    this.garantirEditavel(atual, dto);

    const horario: Horario = {
      salaId: dto.salaId ?? atual.salaId,
      data: dto.data ?? dia(atual.data),
      horaInicio: dto.horaInicio ?? atual.horaInicio,
      horaFim: dto.horaFim ?? atual.horaFim,
    };
    const status = dto.status ?? atual.status;
    const mudouHorario =
      horario.salaId !== atual.salaId ||
      horario.data !== dia(atual.data) ||
      horario.horaInicio !== atual.horaInicio ||
      horario.horaFim !== atual.horaFim;

    if (status !== ReservaStatus.CANCELADA && mudouHorario) {
      await this.validarHorario(horario, id);
    }
    if (dto.solicitanteId && dto.solicitanteId !== atual.solicitanteId) {
      await this.garantirSolicitanteAtivo(dto.solicitanteId);
    }

    const cancelando = status === ReservaStatus.CANCELADA;
    const responsavelId = dto.responsavelId === undefined ? atual.responsavelId : dto.responsavelId;
    const destinatariosNotificacao = dto.destinatariosNotificacao ?? atual.destinatariosNotificacao;
    if (dto.responsavelId !== atual.responsavelId) await this.garantirResponsavelAtivo(dto.responsavelId);
    if (dto.responsavelId !== undefined || dto.destinatariosNotificacao !== undefined) {
      this.validarDestinatarios(responsavelId, destinatariosNotificacao);
    }
    const mudouResponsavel = dto.responsavelId !== undefined && dto.responsavelId !== atual.responsavelId;
    const mudouDestinatarios = dto.destinatariosNotificacao !== undefined && dto.destinatariosNotificacao !== atual.destinatariosNotificacao;
    const confirmando = status === ReservaStatus.CONFIRMADA && atual.status === ReservaStatus.SOLICITADA;
    const mudouSolicitante = !!dto.solicitanteId && dto.solicitanteId !== atual.solicitanteId;

    const reserva = await this.prisma.reserva.update({
      where: { id },
      data: {
        salaId: dto.salaId,
        solicitanteId: dto.solicitanteId,
        responsavelId: dto.responsavelId,
        destinatariosNotificacao: dto.destinatariosNotificacao,
        data: dto.data ? dataUtc(dto.data) : undefined,
        horaInicio: dto.horaInicio,
        horaFim: dto.horaFim,
        titulo: dto.titulo === undefined ? undefined : dto.titulo.trim() || null,
        observacoes: dto.observacoes === undefined ? undefined : dto.observacoes.trim() || null,
        status: dto.status,
        notificarTelegram: dto.notificarTelegram,
        motivoCancelamento: cancelando ? (dto.motivoCancelamento?.trim() ?? null) : undefined,
        canceladoEm: cancelando ? new Date() : undefined,
        // Trocar qualquer coisa relevante reabre a janela do lembrete de 30 minutos.
        lembrete30MinEnviado: mudouHorario || cancelando ? false : undefined,
        lembreteFim30MinEnviado: mudouHorario || cancelando ? false : undefined,
      },
      include: RESERVA_INCLUDE,
    });

    if (cancelando) {
      await this.avisarDestinatarios(reserva, 'RESERVA_SALA_CANCELADA', 'Reserva de sala cancelada');
    } else if (confirmando) {
      await this.avisarDestinatarios(reserva, 'RESERVA_SALA_CONFIRMADA', 'Reserva de sala confirmada');
    } else if (mudouHorario || mudouSolicitante || mudouResponsavel || mudouDestinatarios) {
      await this.avisarDestinatarios(reserva, 'RESERVA_SALA_ATUALIZADA', 'Reserva de sala atualizada');
    }

    await this.agenda.enfileirar([reserva.id]);
    this.agendamentoGateway.avisarMudancaDeReserva();
    return reserva;
  }

  /** Cancelar é o caminho normal: mantém o registro e libera o horário. */
  cancelar(id: string, motivo?: string) {
    return this.update(id, { status: ReservaStatus.CANCELADA, motivoCancelamento: motivo });
  }

  async cancelarMinhaSolicitacao(id: string, userId: string) {
    const atual = await this.findOne(id);
    if (atual.solicitanteId !== userId) {
      throw new ForbiddenException('Você só pode cancelar sua própria solicitação de sala');
    }
    if (atual.status !== ReservaStatus.SOLICITADA) {
      throw new BadRequestException('Só é possível cancelar uma solicitação de sala ainda pendente');
    }
    return this.cancelar(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.reserva.delete({ where: { id } });
    // O vínculo com o evento sobrevive à reserva, então a agenda ainda é limpa.
    await this.agenda.enfileirar([id]);
    this.agendamentoGateway.avisarMudancaDeReserva();
    return { success: true };
  }

  /**
   * Uma reserva cancelada é história — nada nela muda mais. Uma SOLICITADA ainda
   * não foi decidida, então segue editável livremente até ser confirmada ou
   * cancelada, não importa se o horário pedido já passou. Só a CONFIRMADA — um
   * compromisso já assumido — trava com o tempo: em andamento só aceita uma
   * cancelação pura, e finalizada não aceita mais nada.
   */
  private garantirEditavel(atual: { status: ReservaStatus; data: Date; horaInicio: string; horaFim: string }, dto: UpdateReservaDto) {
    if (atual.status === ReservaStatus.CANCELADA) {
      throw new BadRequestException('Esta reserva já foi cancelada e não pode mais ser alterada.');
    }
    if (atual.status === ReservaStatus.SOLICITADA) return;

    const estado = estadoTemporalReserva(atual);
    if (estado === 'FUTURA') return;
    if (estado === 'FINALIZADA') {
      throw new BadRequestException('Esta reserva já terminou e não pode mais ser alterada.');
    }

    const querApenasCancelar =
      dto.status === ReservaStatus.CANCELADA &&
      dto.salaId === undefined &&
      dto.solicitanteId === undefined &&
      dto.responsavelId === undefined &&
      dto.destinatariosNotificacao === undefined &&
      dto.data === undefined &&
      dto.horaInicio === undefined &&
      dto.horaFim === undefined &&
      dto.titulo === undefined &&
      dto.observacoes === undefined;
    if (!querApenasCancelar) {
      throw new BadRequestException('Esta reserva já começou — não é mais possível editá-la, só cancelar.');
    }
  }

  private async validarHorario(horario: Horario, ignorarReservaId?: string) {
    if (emMinutos(horario.horaFim) <= emMinutos(horario.horaInicio)) {
      throw new BadRequestException('O horário final precisa ser depois do inicial');
    }

    const sala = await this.prisma.sala.findUnique({
      where: { id: horario.salaId },
      include: { disponibilidades: true },
    });
    if (!sala) throw new NotFoundException('Sala não encontrada');
    if (!sala.ativo) throw new BadRequestException('Esta sala está inativa');

    if (!dentroDaDisponibilidade(sala.disponibilidades, horario.data, horario)) {
      throw new BadRequestException('A sala não está disponível nesse dia e horário');
    }

    const conflito = await this.prisma.reserva.findFirst({
      where: {
        salaId: horario.salaId,
        data: dataUtc(horario.data),
        status: { in: [...STATUS_QUE_OCUPAM] },
        id: ignorarReservaId ? { not: ignorarReservaId } : undefined,
        // Intervalos meio-abertos: encostar (10:00-11:00 e 11:00-12:00) não conflita.
        horaInicio: { lt: horario.horaFim },
        horaFim: { gt: horario.horaInicio },
      },
      select: { horaInicio: true, horaFim: true },
    });
    if (conflito) {
      throw new ConflictException(`Este horário já está reservado (${conflito.horaInicio} às ${conflito.horaFim})`);
    }
  }

  private async garantirSolicitanteAtivo(solicitanteId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: solicitanteId }, select: { ativo: true } });
    if (!user) throw new NotFoundException('Solicitante não encontrado');
    if (!user.ativo) throw new BadRequestException('O solicitante está inativo');
  }

  private async garantirResponsavelAtivo(responsavelId?: string | null) {
    if (responsavelId == null) return;
    const user = await this.prisma.user.findUnique({ where: { id: responsavelId }, select: { ativo: true } });
    if (!user?.ativo) throw new BadRequestException('Selecione um responsável ativo');
  }

  private validarDestinatarios(responsavelId: string | null | undefined, destinatarios: ReservaDestinatarios) {
    if (destinatarios !== ReservaDestinatarios.SOLICITANTE && !responsavelId) {
      throw new BadRequestException('Selecione um responsável para enviar notificações a ele');
    }
  }

  private async avisarDestinatarios(
    reserva: DestinatariosReserva & {
      data: Date;
      horaInicio: string;
      horaFim: string;
      titulo: string | null;
      notificarTelegram: boolean;
      sala: { nome: string };
      solicitante: { nome: string; telegramUsername: string | null };
      responsavel: { nome: string; telegramUsername: string | null } | null;
    },
    tipo: string,
    titulo: string,
  ) {
    for (const [index, userId] of destinatariosReserva(reserva).entries()) {
      await this.notificacoesService.criar({
        userId,
        tipo,
        titulo,
        mensagem: `${reserva.sala.nome} em ${formatarDataBr(reserva.data)}, ${reserva.horaInicio} às ${reserva.horaFim}`,
        link: '/agendamentos',
        enviarTelegram: reserva.notificarTelegram,
        telegramGrupoTexto: index === 0 ? textoGrupoReserva(reserva, tipo, titulo) : undefined,
      });
    }
  }
}
