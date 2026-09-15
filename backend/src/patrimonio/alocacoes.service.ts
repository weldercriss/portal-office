import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AlocacaoStatus, EquipamentoStatus, Prisma, StatusColaborador } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlocacaoDto, DevolverAlocacaoDto, UpdateAlocacaoDto } from './dto/alocacao.dto';
import { STATUS_ALOCACAO_ATIVA } from './equipamentos.service';
import { EquipamentosService } from './equipamentos.service';
import { TERMO_DIR } from './termo.storage';

const ALOCACAO_INCLUDE = {
  equipamento: {
    include: { tipo: { select: { id: true, nome: true, exigeTermo: true } } },
  },
  colaborador: { select: { id: true, nome: true, email: true, statusColaborador: true, ativo: true } },
  registradoPor: { select: { id: true, nome: true } },
} as const satisfies Prisma.AlocacaoEquipamentoInclude;

/** Status finais: a alocação virou histórico e já soltou o item. */
const STATUS_ENCERRADOS: AlocacaoStatus[] = [AlocacaoStatus.DEVOLVIDO, AlocacaoStatus.CANCELADA];

export interface FiltrosAlocacao {
  colaboradorId?: string;
  equipamentoId?: string;
  status?: string;
  /** Só o que ainda está na mão de alguém. */
  ativas?: boolean;
}

/** Dia em UTC à meia-noite: o horário não faz parte do registro. */
function dataUtc(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

function hojeUtc(): Date {
  return dataUtc(new Date().toISOString().slice(0, 10));
}

function statusValido(valor: string | undefined): AlocacaoStatus | undefined {
  return valor && valor in AlocacaoStatus ? (valor as AlocacaoStatus) : undefined;
}

function descreverItem(equipamento: { tipo: { nome: string }; numero: string | null; marca: string | null }): string {
  const detalhe = equipamento.numero ?? equipamento.marca;
  return detalhe ? `${equipamento.tipo.nome} (${detalhe})` : equipamento.tipo.nome;
}

@Injectable()
export class AlocacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly equipamentos: EquipamentosService,
  ) {}

  findAll(filtros: FiltrosAlocacao = {}) {
    return this.prisma.alocacaoEquipamento.findMany({
      where: {
        colaboradorId: filtros.colaboradorId,
        equipamentoId: filtros.equipamentoId,
        status: filtros.ativas ? { in: [...STATUS_ALOCACAO_ATIVA] } : statusValido(filtros.status),
      },
      orderBy: [{ dataInicio: 'desc' }, { criadoEm: 'desc' }],
      include: ALOCACAO_INCLUDE,
    });
  }

  async findOne(id: string) {
    const alocacao = await this.prisma.alocacaoEquipamento.findUnique({ where: { id }, include: ALOCACAO_INCLUDE });
    if (!alocacao) throw new NotFoundException('Registro de equipamento não encontrado');
    return alocacao;
  }

  /**
   * Entrega um item a um colaborador. Marcar o equipamento como EM_USO e criar
   * o registro anda junto numa transação: um item em uso sem dono, ou um dono
   * sem item reservado, deixaria o inventário mentindo.
   */
  async create(dto: CreateAlocacaoDto, registradoPorId: string) {
    if (dto.status && STATUS_ENCERRADOS.includes(dto.status)) {
      throw new BadRequestException('Um registro não pode nascer devolvido ou cancelado');
    }

    await this.garantirColaboradorApto(dto.colaboradorId);
    const equipamento = await this.equipamentos.findOne(dto.equipamentoId);
    this.equipamentos.garantirEntregavel(equipamento);
    if (equipamento.alocacoes.length > 0) {
      const dono = equipamento.alocacoes[0].colaborador.nome;
      throw new ConflictException(`Este equipamento já está com ${dono}`);
    }

    const alocacao = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.alocacaoEquipamento.create({
        data: {
          equipamentoId: dto.equipamentoId,
          colaboradorId: dto.colaboradorId,
          dataInicio: dataUtc(dto.dataInicio),
          status: dto.status ?? AlocacaoStatus.PENDENTE,
          estadoNaEntrega: dto.estadoNaEntrega ?? equipamento.estado,
          observacoes: dto.observacoes?.trim() || null,
          registradoPorId,
        },
        include: ALOCACAO_INCLUDE,
      });
      await tx.equipamento.update({
        where: { id: dto.equipamentoId },
        data: { status: EquipamentoStatus.EM_USO },
      });
      return criada;
    });

    await this.avisarColaborador(alocacao, 'EQUIPAMENTO_ENTREGUE', 'Equipamento registrado para você');
    return alocacao;
  }

  /**
   * Ajusta um registro em aberto. Trocar o equipamento ou o colaborador é
   * corrigir um lançamento errado, então as mesmas regras da entrega valem.
   */
  async update(id: string, dto: UpdateAlocacaoDto) {
    const atual = await this.findOne(id);
    if (STATUS_ENCERRADOS.includes(atual.status)) {
      throw new ConflictException('Este registro já foi encerrado e não pode mais ser alterado');
    }
    if (dto.status && STATUS_ENCERRADOS.includes(dto.status)) {
      throw new BadRequestException('Use a devolução para encerrar o registro');
    }

    const trocouEquipamento = !!dto.equipamentoId && dto.equipamentoId !== atual.equipamentoId;
    const trocouColaborador = !!dto.colaboradorId && dto.colaboradorId !== atual.colaboradorId;

    if (trocouColaborador) await this.garantirColaboradorApto(dto.colaboradorId!);
    if (trocouEquipamento) {
      const novo = await this.equipamentos.findOne(dto.equipamentoId!);
      this.equipamentos.garantirEntregavel(novo);
      if (novo.alocacoes.some((alocacao) => alocacao.id !== id)) {
        throw new ConflictException(`Este equipamento já está com ${novo.alocacoes[0].colaborador.nome}`);
      }
    }

    // Exigir o termo antes de marcar como assinado evita um "assinado" sem
    // documento nenhum por trás.
    if (dto.status === AlocacaoStatus.ASSINADO && !atual.termoCaminho) {
      throw new BadRequestException('Anexe o termo assinado antes de marcar o registro como assinado');
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.alocacaoEquipamento.update({
        where: { id },
        data: {
          equipamentoId: dto.equipamentoId,
          colaboradorId: dto.colaboradorId,
          dataInicio: dto.dataInicio ? dataUtc(dto.dataInicio) : undefined,
          status: dto.status,
          estadoNaEntrega: dto.estadoNaEntrega,
          observacoes: dto.observacoes === undefined ? undefined : dto.observacoes.trim() || null,
        },
        include: ALOCACAO_INCLUDE,
      });

      if (trocouEquipamento) {
        await tx.equipamento.update({
          where: { id: atual.equipamentoId },
          data: { status: EquipamentoStatus.ESTOQUE },
        });
        await tx.equipamento.update({
          where: { id: dto.equipamentoId! },
          data: { status: EquipamentoStatus.EM_USO },
        });
      }
      return atualizada;
    });
  }

  /**
   * Devolve o item ao estoque preservando o registro: é o histórico de quem
   * ficou com o quê, e ele nunca é sobrescrito.
   */
  async devolver(id: string, dto: DevolverAlocacaoDto = {}) {
    const atual = await this.findOne(id);
    if (STATUS_ENCERRADOS.includes(atual.status)) {
      throw new ConflictException('Este registro já foi encerrado');
    }

    const alocacao = await this.encerrar(this.prisma, atual.id, atual.equipamentoId, {
      status: AlocacaoStatus.DEVOLVIDO,
      dataDevolucao: dto.dataDevolucao ? dataUtc(dto.dataDevolucao) : hojeUtc(),
      estadoNaDevolucao: dto.estadoNaDevolucao,
      motivoDevolucao: dto.motivoDevolucao?.trim() || null,
    });

    await this.avisarColaborador(alocacao, 'EQUIPAMENTO_DEVOLVIDO', 'Devolução de equipamento registrada');
    return alocacao;
  }

  /** Cancela um lançamento equivocado: o item volta ao estoque sem virar devolução. */
  async cancelar(id: string, motivo?: string) {
    const atual = await this.findOne(id);
    if (STATUS_ENCERRADOS.includes(atual.status)) {
      throw new ConflictException('Este registro já foi encerrado');
    }
    return this.encerrar(this.prisma, atual.id, atual.equipamentoId, {
      status: AlocacaoStatus.CANCELADA,
      motivoDevolucao: motivo?.trim() || null,
    });
  }

  /**
   * Devolve tudo que está com o colaborador. É o que roda quando ele é
   * desligado: os equipamentos que estavam com ele voltam para o estoque, e o
   * registro de cada um continua no histórico.
   */
  async devolverTudoDoColaborador(colaboradorId: string, motivo = 'Desligamento do colaborador') {
    const abertas = await this.prisma.alocacaoEquipamento.findMany({
      where: { colaboradorId, status: { in: [...STATUS_ALOCACAO_ATIVA] } },
      select: { id: true, equipamentoId: true },
    });
    if (abertas.length === 0) return { devolvidas: 0 };

    const dataDevolucao = hojeUtc();
    await this.prisma.$transaction([
      this.prisma.alocacaoEquipamento.updateMany({
        where: { id: { in: abertas.map((a) => a.id) } },
        data: { status: AlocacaoStatus.DEVOLVIDO, dataDevolucao, motivoDevolucao: motivo },
      }),
      this.prisma.equipamento.updateMany({
        where: { id: { in: abertas.map((a) => a.equipamentoId) } },
        data: { status: EquipamentoStatus.ESTOQUE },
      }),
    ]);

    await this.notificacoesService.criarParaAdmins({
      tipo: 'EQUIPAMENTO_DEVOLVIDO',
      titulo: 'Equipamentos voltaram ao estoque',
      mensagem: `${abertas.length} equipamento(s) voltaram ao estoque por desligamento. Confira o estado de cada um.`,
      link: '/patrimonio',
    });

    return { devolvidas: abertas.length };
  }

  async remove(id: string) {
    const alocacao = await this.findOne(id);
    if (!STATUS_ENCERRADOS.includes(alocacao.status)) {
      throw new ConflictException('Devolva ou cancele o registro antes de excluí-lo');
    }
    await this.apagarArquivoTermo(alocacao.termoCaminho);
    await this.prisma.alocacaoEquipamento.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Anexa o termo assinado. Chegar o documento é o que faz o registro virar
   * ASSINADO — foi para isso que o RH pediu o campo.
   */
  async anexarTermo(id: string, file: Express.Multer.File) {
    const atual = await this.findOne(id);
    if (STATUS_ENCERRADOS.includes(atual.status)) {
      throw new ConflictException('Este registro já foi encerrado');
    }

    // Um termo por registro: o novo substitui o anterior no disco também.
    await this.apagarArquivoTermo(atual.termoCaminho);

    return this.prisma.alocacaoEquipamento.update({
      where: { id },
      data: {
        termoNome: file.originalname,
        termoCaminho: file.filename,
        termoMimeType: file.mimetype,
        termoEnviadoEm: new Date(),
        status: AlocacaoStatus.ASSINADO,
      },
      include: ALOCACAO_INCLUDE,
    });
  }

  /** Remover o termo desfaz o "assinado": o registro volta a estar entregue. */
  async removerTermo(id: string) {
    const atual = await this.findOne(id);
    if (!atual.termoCaminho) throw new NotFoundException('Este registro não tem termo anexado');
    await this.apagarArquivoTermo(atual.termoCaminho);

    return this.prisma.alocacaoEquipamento.update({
      where: { id },
      data: {
        termoNome: null,
        termoCaminho: null,
        termoMimeType: null,
        termoEnviadoEm: null,
        status: atual.status === AlocacaoStatus.ASSINADO ? AlocacaoStatus.ENTREGUE : atual.status,
      },
      include: ALOCACAO_INCLUDE,
    });
  }

  async obterTermo(id: string, usuario: { id: string; role: string }) {
    const alocacao = await this.findOne(id);
    if (usuario.role !== 'ADMIN' && usuario.id !== alocacao.colaboradorId) {
      throw new NotFoundException('Registro de equipamento não encontrado');
    }
    if (!alocacao.termoCaminho) throw new NotFoundException('Este registro não tem termo anexado');

    return {
      nome: alocacao.termoNome ?? 'termo',
      mimeType: alocacao.termoMimeType ?? 'application/octet-stream',
      caminho: join(TERMO_DIR, alocacao.termoCaminho),
    };
  }

  /** Encerra o registro e devolve o item ao estoque na mesma transação. */
  private encerrar(
    prisma: PrismaService,
    id: string,
    equipamentoId: string,
    dados: Prisma.AlocacaoEquipamentoUpdateInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const encerrada = await tx.alocacaoEquipamento.update({
        where: { id },
        data: dados,
        include: ALOCACAO_INCLUDE,
      });
      await tx.equipamento.update({
        where: { id: equipamentoId },
        data: {
          status: EquipamentoStatus.ESTOQUE,
          // Reavaliação na volta corrige o estado do item para a próxima entrega.
          estado: encerrada.estadoNaDevolucao ?? undefined,
        },
      });
      return encerrada;
    });
  }

  /**
   * Regra central do plano: desligado não recebe equipamento. Inativo também
   * não — a conta já não entra no portal.
   */
  private async garantirColaboradorApto(colaboradorId: string) {
    const colaborador = await this.prisma.user.findUnique({
      where: { id: colaboradorId },
      select: { nome: true, ativo: true, statusColaborador: true },
    });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado');
    if (colaborador.statusColaborador === StatusColaborador.DESLIGADO) {
      throw new BadRequestException(
        `${colaborador.nome} está desligado e não pode receber equipamentos. Registre a devolução do que ainda estiver com ele.`,
      );
    }
    if (!colaborador.ativo) {
      throw new BadRequestException(`${colaborador.nome} está inativo no portal`);
    }
  }

  /** O arquivo pode já não estar lá (disco limpo, restore): apagar é best-effort. */
  private async apagarArquivoTermo(caminho: string | null) {
    if (!caminho) return;
    await unlink(join(TERMO_DIR, caminho)).catch(() => undefined);
  }

  private async avisarColaborador(
    alocacao: {
      colaboradorId: string;
      equipamento: { tipo: { nome: string }; numero: string | null; marca: string | null };
    },
    tipo: string,
    titulo: string,
  ) {
    await this.notificacoesService.criar({
      userId: alocacao.colaboradorId,
      tipo,
      titulo,
      mensagem: descreverItem(alocacao.equipamento),
      link: '/patrimonio',
    });
  }
}
