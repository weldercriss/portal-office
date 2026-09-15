import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RegraRecorrenciaPlantao } from '@prisma/client';
import { AgendaGoogleService } from '../agenda-google/agenda-google.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { SolicitacoesService } from '../solicitacoes/solicitacoes.service';
import { CreatePlantaoDto, PlantaoStatusDto } from './dto/create-plantao.dto';
import { UpdatePlantaoDto } from './dto/update-plantao.dto';

const PLANTAO_INCLUDE = {
  user: { select: { id: true, nome: true, email: true } },
  criadoPor: { select: { id: true, nome: true } },
  tipoPlantao: true,
} as const;

const TROCA_INCLUDE = {
  plantaoOrigem: { include: PLANTAO_INCLUDE },
  plantaoDestino: { include: PLANTAO_INCLUDE },
  solicitante: { select: { id: true, nome: true } },
  destinatario: { select: { id: true, nome: true } },
} as const;

export interface FiltrosPlantao {
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
}

const MAX_OCORRENCIAS_SERIE = 366;

function formatarData(data: Date) {
  return data.toISOString().slice(0, 10);
}

function formatarDataBr(data: Date) {
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Gera as datas (YYYY-MM-DD) de uma recorrência. Usa exclusivamente métodos UTC pra ficar
 * consistente com `formatarData`/`formatarDataBr` e o `.slice(0,10)` do frontend — misturar
 * métodos locais aqui deslocaria a série em ±1 dia em servidores fora de UTC+0.
 */
function gerarDatasRecorrencia(
  regra: RegraRecorrenciaPlantao,
  dataInicioStr: string,
  dataFimStr: string | undefined,
  diasSemana: number[] | undefined,
): string[] {
  if (regra === RegraRecorrenciaPlantao.UNICO) return [dataInicioStr];

  const inicio = new Date(dataInicioStr);
  const fim = new Date(dataFimStr as string);
  const datas: string[] = [];

  if (regra === RegraRecorrenciaPlantao.SEMANAL) {
    const dias = new Set(diasSemana ?? []);
    const cursor = new Date(inicio);
    while (cursor.getTime() <= fim.getTime() && datas.length <= MAX_OCORRENCIAS_SERIE) {
      if (dias.has(cursor.getUTCDay())) datas.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else if (regra === RegraRecorrenciaPlantao.MENSAL) {
    const diaAlvo = inicio.getUTCDate();
    let ano = inicio.getUTCFullYear();
    let mes = inicio.getUTCMonth();
    while (datas.length <= MAX_OCORRENCIAS_SERIE) {
      const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      const dia = Math.min(diaAlvo, ultimoDiaDoMes);
      const candidato = new Date(Date.UTC(ano, mes, dia));
      if (candidato.getTime() > fim.getTime()) break;
      if (candidato.getTime() >= inicio.getTime()) datas.push(candidato.toISOString().slice(0, 10));
      mes += 1;
      if (mes > 11) {
        mes = 0;
        ano += 1;
      }
    }
  }

  return datas;
}

@Injectable()
export class PlantoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly solicitacoesService: SolicitacoesService,
    private readonly agendaGoogleService: AgendaGoogleService,
  ) {}

  findAll(filtros: FiltrosPlantao) {
    return this.prisma.plantao.findMany({
      where: {
        userId: filtros.userId,
        status: filtros.status as never,
        data: {
          gte: filtros.from ? new Date(filtros.from) : undefined,
          lte: filtros.to ? new Date(filtros.to) : undefined,
        },
      },
      orderBy: { data: 'asc' },
      include: PLANTAO_INCLUDE,
    });
  }

  async findOne(id: string) {
    return this.obterOuFalhar(id);
  }

  async findDisponiveisParaTroca(plantaoId: string, userId: string) {
    const plantao = await this.obterOuFalhar(plantaoId);
    if (plantao.userId !== userId) {
      throw new ForbiddenException('Você só pode solicitar troca do seu próprio plantão');
    }
    return this.prisma.plantao.findMany({
      where: {
        id: { not: plantaoId },
        status: 'PUBLICADO',
        data: { gte: new Date() },
        AND: [{ userId: { not: null } }, { userId: { not: userId } }],
      },
      orderBy: { data: 'asc' },
      include: PLANTAO_INCLUDE,
    });
  }

  async create(dto: CreatePlantaoDto, criadoPorId: string) {
    const status = dto.status ?? PlantaoStatusDto.RASCUNHO;
    if (status === PlantaoStatusDto.PUBLICADO && !dto.userId) {
      throw new BadRequestException('Não é possível publicar um plantão sem um plantonista vinculado');
    }

    const tipoPlantao = await this.validarTipo(dto.tipoPlantaoId);

    if (tipoPlantao.regra !== RegraRecorrenciaPlantao.UNICO && !dto.dataFim) {
      throw new BadRequestException('Informe a data final da recorrência');
    }
    if (tipoPlantao.regra === RegraRecorrenciaPlantao.SEMANAL && !dto.diasSemana?.length) {
      throw new BadRequestException('Selecione ao menos um dia da semana para a recorrência semanal');
    }

    const datas = gerarDatasRecorrencia(tipoPlantao.regra, dto.data, dto.dataFim, dto.diasSemana);
    if (datas.length === 0) {
      throw new BadRequestException('Nenhuma data foi gerada para esta recorrência');
    }
    if (datas.length > MAX_OCORRENCIAS_SERIE) {
      throw new BadRequestException(
        `A recorrência geraria ${datas.length} plantões; o máximo permitido é ${MAX_OCORRENCIAS_SERIE}`,
      );
    }

    if (dto.userId) {
      const userId = dto.userId;
      const resultados = await Promise.all(
        datas.map((d) => this.solicitacoesService.existeAfastamentoNoPeriodo(userId, new Date(d))),
      );
      const idxConflito = resultados.findIndex((r) => !!r);
      if (idxConflito !== -1) {
        const conflito = resultados[idxConflito]!;
        throw new BadRequestException(
          `Este colaborador possui uma solicitação aprovada de afastamento (${conflito.tipo.nome}) em ${datas[idxConflito]}`,
        );
      }
    }

    const isSerie = tipoPlantao.regra !== RegraRecorrenciaPlantao.UNICO;

    const plantoes = await this.prisma.$transaction(async (tx) => {
      let serieId: string | null = null;
      if (isSerie) {
        const serie = await tx.plantaoSerie.create({
          data: {
            tipoPlantaoId: tipoPlantao.id,
            dataInicio: new Date(dto.data),
            dataFim: new Date(dto.dataFim as string),
            diasSemana: dto.diasSemana ?? [],
            criadoPorId,
          },
        });
        serieId = serie.id;
      }

      const criados = [];
      for (const dataStr of datas) {
        criados.push(
          await tx.plantao.create({
            data: {
              nome: dto.nome,
              data: new Date(dataStr),
              userId: dto.userId ?? undefined,
              criadoPorId,
              status,
              tipoPlantaoId: tipoPlantao.id,
              serieId,
            },
            include: PLANTAO_INCLUDE,
          }),
        );
      }
      return criados;
    });

    if (dto.userId) await this.notificarVinculoSerie(dto.userId, plantoes);
    await this.agendaGoogleService.enfileirar(plantoes.map((plantao) => plantao.id));

    return isSerie ? { serieId: plantoes[0]!.serieId, quantidade: plantoes.length, plantoes } : plantoes[0];
  }

  async update(id: string, dto: UpdatePlantaoDto) {
    const atual = await this.obterOuFalhar(id);
    const proximoStatus = dto.status ?? atual.status;
    const proximoUserId = dto.userId === undefined ? atual.userId : dto.userId;
    if (proximoStatus === PlantaoStatusDto.PUBLICADO && !proximoUserId) {
      throw new BadRequestException('Não é possível publicar um plantão sem um plantonista vinculado');
    }
    const vinculoMudou = dto.userId !== undefined && dto.userId !== atual.userId;
    if (proximoUserId && (vinculoMudou || dto.data)) {
      await this.validarDisponibilidade(proximoUserId, dto.data ? new Date(dto.data) : atual.data);
    }

    if (dto.tipoPlantaoId !== undefined) {
      await this.validarTipo(dto.tipoPlantaoId);
    }

    const plantao = await this.prisma.plantao.update({
      where: { id },
      data: {
        nome: dto.nome,
        data: dto.data ? new Date(dto.data) : undefined,
        userId: dto.userId === undefined ? undefined : dto.userId,
        status: dto.status,
        tipoPlantaoId: dto.tipoPlantaoId === undefined ? undefined : dto.tipoPlantaoId,
      },
      include: PLANTAO_INCLUDE,
    });
    if (vinculoMudou && plantao.userId) await this.notificarVinculo(plantao);
    await this.agendaGoogleService.enfileirar([id]);
    return plantao;
  }

  async remove(id: string) {
    await this.obterOuFalhar(id);
    await this.prisma.plantao.delete({ where: { id } });
    // O vínculo com o evento sobrevive ao plantão, então a agenda ainda é limpa.
    await this.agendaGoogleService.enfileirar([id]);
    return { ok: true };
  }

  async removeSerie(serieId: string) {
    const serie = await this.prisma.plantaoSerie.findUnique({
      where: { id: serieId },
      include: { _count: { select: { plantoes: true } }, plantoes: { select: { id: true } } },
    });
    if (!serie) throw new NotFoundException('Série de plantões não encontrada');
    await this.prisma.plantaoSerie.delete({ where: { id: serieId } });
    await this.agendaGoogleService.enfileirar(serie.plantoes.map((plantao) => plantao.id));
    return { ok: true, removidos: serie._count.plantoes };
  }

  async findTrocas(userId: string, role: string) {
    return this.prisma.trocaPlantao.findMany({
      where: role === 'ADMIN' ? undefined : { OR: [{ solicitanteId: userId }, { destinatarioId: userId }] },
      orderBy: { criadoEm: 'desc' },
      include: TROCA_INCLUDE,
    });
  }

  async solicitarTroca(plantaoOrigemId: string, plantaoDestinoId: string, solicitanteId: string) {
    if (plantaoOrigemId === plantaoDestinoId) {
      throw new BadRequestException('Selecione um plantão diferente para a troca');
    }
    const [origem, destino] = await Promise.all([
      this.obterOuFalhar(plantaoOrigemId),
      this.obterOuFalhar(plantaoDestinoId),
    ]);
    if (origem.userId !== solicitanteId) {
      throw new ForbiddenException('Você só pode solicitar troca do seu próprio plantão');
    }
    if (!destino.userId) {
      throw new BadRequestException('O plantão de destino não possui plantonista vinculado');
    }
    if (destino.userId === solicitanteId) {
      throw new BadRequestException('Selecione um plantão de outro plantonista');
    }

    const troca = await this.prisma.trocaPlantao.create({
      data: {
        plantaoOrigemId,
        plantaoDestinoId,
        solicitanteId,
        destinatarioId: destino.userId,
      },
      include: TROCA_INCLUDE,
    });

    await this.notificacoesService.criar({
      userId: destino.userId,
      tipo: 'TROCA_SOLICITADA',
      titulo: 'Solicitação de troca de plantão',
      mensagem: `${origem.user?.nome ?? 'Um plantonista'} quer trocar o plantão de ${formatarData(origem.data)} pelo seu plantão de ${formatarData(destino.data)}.`,
      telegramTexto: `🔄 Nova solicitação de troca!\n\n${origem.user?.nome ?? 'Um plantonista'} quer trocar o plantão de ${formatarDataBr(origem.data)} pelo seu plantão de ${formatarDataBr(destino.data)}.\n\nAcesse o sistema para aceitar ou rejeitar a troca.`,
      link: '/plantoes',
    });
    await this.notificacoesService.criarParaAdmins({
      tipo: 'TROCA_SOLICITADA',
      titulo: 'Solicitação de troca de plantão',
      mensagem: `${origem.user?.nome ?? 'Um plantonista'} solicitou trocar o plantão de ${formatarData(origem.data)} com ${destino.user?.nome ?? 'outro plantonista'} (plantão de ${formatarData(destino.data)}).`,
      telegramTexto: `🔄 Troca de plantão solicitada\n\n${origem.user?.nome ?? 'Um plantonista'} solicitou trocar o plantão de ${formatarDataBr(origem.data)} com ${destino.user?.nome ?? 'outro plantonista'} (plantão de ${formatarDataBr(destino.data)}).\n\nAcompanhe pelo sistema.`,
      link: '/plantoes',
    });

    return troca;
  }

  async aceitarTroca(id: string, userId: string) {
    const troca = await this.obterTrocaOuFalhar(id);
    if (troca.destinatarioId !== userId) {
      throw new ForbiddenException('Apenas o plantonista convidado pode responder a esta troca');
    }
    if (troca.status !== 'PENDENTE') {
      throw new BadRequestException('Esta troca já foi respondida');
    }

    const [, , trocaAtualizada] = await this.prisma.$transaction([
      this.prisma.plantao.update({
        where: { id: troca.plantaoOrigemId },
        data: { userId: troca.destinatarioId },
      }),
      this.prisma.plantao.update({
        where: { id: troca.plantaoDestinoId },
        data: { userId: troca.solicitanteId },
      }),
      this.prisma.trocaPlantao.update({
        where: { id },
        data: { status: 'ACEITA', respondidoEm: new Date() },
        include: TROCA_INCLUDE,
      }),
    ]);

    await this.notificacoesService.criar({
      userId: troca.solicitanteId,
      tipo: 'TROCA_ACEITA',
      titulo: 'Troca de plantão aceita',
      mensagem: `${troca.destinatario.nome} aceitou a troca de plantão.`,
      telegramTexto: `✅ Troca de plantão aceita!\n\n${troca.destinatario.nome} aceitou a troca de plantão.\n\nConfira sua nova escala no sistema.`,
      link: '/plantoes',
    });
    await this.agendaGoogleService.enfileirar([troca.plantaoOrigemId, troca.plantaoDestinoId]);

    await this.notificacoesService.criarParaAdmins({
      tipo: 'TROCA_ACEITA',
      titulo: 'Troca de plantão realizada',
      mensagem: `O plantonista do dia ${formatarData(troca.plantaoOrigem.data)} trocou com o plantonista do dia ${formatarData(troca.plantaoDestino.data)}.`,
      telegramTexto: `✅ Troca de plantão realizada\n\nO plantonista do dia ${formatarDataBr(troca.plantaoOrigem.data)} trocou com o plantonista do dia ${formatarDataBr(troca.plantaoDestino.data)}.\n\nConfira a escala atualizada no sistema.`,
      link: '/plantoes',
    });

    return trocaAtualizada;
  }

  async rejeitarTroca(id: string, userId: string) {
    const troca = await this.obterTrocaOuFalhar(id);
    if (troca.destinatarioId !== userId) {
      throw new ForbiddenException('Apenas o plantonista convidado pode responder a esta troca');
    }
    if (troca.status !== 'PENDENTE') {
      throw new BadRequestException('Esta troca já foi respondida');
    }

    const trocaAtualizada = await this.prisma.trocaPlantao.update({
      where: { id },
      data: { status: 'REJEITADA', respondidoEm: new Date() },
      include: TROCA_INCLUDE,
    });

    await this.notificacoesService.criar({
      userId: troca.solicitanteId,
      tipo: 'TROCA_REJEITADA',
      titulo: 'Troca de plantão rejeitada',
      mensagem: `${troca.destinatario.nome} rejeitou a troca de plantão.`,
      telegramTexto: `❌ Troca de plantão rejeitada\n\n${troca.destinatario.nome} rejeitou a troca de plantão.\n\nConfira os detalhes no sistema.`,
      link: '/plantoes',
    });

    return trocaAtualizada;
  }

  private async validarDisponibilidade(userId: string, data: Date) {
    const afastamento = await this.solicitacoesService.existeAfastamentoNoPeriodo(userId, data);
    if (afastamento) {
      throw new BadRequestException(
        `Este colaborador possui uma solicitação aprovada de afastamento (${afastamento.tipo.nome}) nesta data`,
      );
    }
  }

  private async validarTipo(tipoPlantaoId?: string) {
    if (!tipoPlantaoId) throw new BadRequestException('Informe o tipo do plantão');

    const tipoPlantao = await this.prisma.tipoPlantao.findUnique({ where: { id: tipoPlantaoId } });
    if (!tipoPlantao || !tipoPlantao.ativo) throw new BadRequestException('Tipo de plantão inválido ou inativo');

    return tipoPlantao;
  }

  private async notificarVinculoSerie(userId: string, plantoes: Array<{ data: Date }>) {
    if (plantoes.length === 0) return;
    if (plantoes.length === 1) {
      await this.notificarVinculo({ userId, data: plantoes[0]!.data });
      return;
    }
    const primeira = formatarDataBr(plantoes[0]!.data);
    const ultima = formatarDataBr(plantoes[plantoes.length - 1]!.data);
    await this.notificacoesService.criar({
      userId,
      tipo: 'PLANTAO_VINCULADO',
      titulo: 'Novos plantões vinculados',
      mensagem: `Você foi vinculado a ${plantoes.length} plantões, de ${primeira} a ${ultima}.`,
      telegramTexto: `🔔 Novos plantões vinculados!\n\nVocê foi vinculado a ${plantoes.length} plantões.\n\n📅 Período: ${primeira} a ${ultima}\n\nPrograme-se e boa escala! 😉`,
      link: '/plantoes',
    });
  }

  private async notificarVinculo(plantao: { userId: string | null; data: Date }) {
    if (!plantao.userId) return;
    await this.notificacoesService.criar({
      userId: plantao.userId,
      tipo: 'PLANTAO_VINCULADO',
      titulo: 'Novo plantão vinculado',
      mensagem: `Você foi vinculado ao plantão de ${formatarData(plantao.data)}.`,
      telegramTexto: `🔔 Novo plantão vinculado!\n\nVocê foi vinculado a um plantão.\n\n📅 Data: ${formatarDataBr(plantao.data)}\n\nPrograme-se e boa escala! 😉`,
      link: '/plantoes',
    });
  }

  private async obterOuFalhar(id: string) {
    const plantao = await this.prisma.plantao.findUnique({ where: { id }, include: PLANTAO_INCLUDE });
    if (!plantao) throw new NotFoundException('Plantão não encontrado');
    return plantao;
  }

  private async obterTrocaOuFalhar(id: string) {
    const troca = await this.prisma.trocaPlantao.findUnique({ where: { id }, include: TROCA_INCLUDE });
    if (!troca) throw new NotFoundException('Solicitação de troca não encontrada');
    return troca;
  }
}
