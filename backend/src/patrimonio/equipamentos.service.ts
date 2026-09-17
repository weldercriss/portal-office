import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AlocacaoStatus, EquipamentoStatus, EstadoEquipamento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipamentoDto, UpdateEquipamentoDto } from './dto/equipamento.dto';

/**
 * Alocação que ainda prende o item a um colaborador. Devolver ou cancelar é o
 * que solta o equipamento de volta para o estoque.
 */
export const STATUS_ALOCACAO_ATIVA = [
  AlocacaoStatus.PENDENTE,
  AlocacaoStatus.ENTREGUE,
  AlocacaoStatus.ASSINADO,
] as const;

const ROTULO_STATUS: Record<EquipamentoStatus, string> = {
  EM_COMPRA: 'processo de compra',
  AGUARDANDO_CHEGADA: 'aguardando chegada',
  ESTOQUE: 'estoque',
  EM_USO: 'uso',
  MANUTENCAO: 'manutenção',
  BAIXADO: 'baixa',
};

/** Situações em que o item não está fisicamente disponível para entrega. */
const STATUS_NAO_ENTREGAVEIS: EquipamentoStatus[] = [
  EquipamentoStatus.EM_COMPRA,
  EquipamentoStatus.AGUARDANDO_CHEGADA,
  EquipamentoStatus.MANUTENCAO,
  EquipamentoStatus.BAIXADO,
];

export const EQUIPAMENTO_INCLUDE = {
  tipo: { select: { id: true, nome: true, exigeTermo: true } },
  alocacoes: {
    where: { status: { in: [...STATUS_ALOCACAO_ATIVA] } },
    include: { colaborador: { select: { id: true, nome: true, email: true, statusColaborador: true } } },
    orderBy: { dataInicio: 'desc' },
    take: 1,
  },
} as const satisfies Prisma.EquipamentoInclude;

export interface FiltrosEquipamento {
  tipoId?: string;
  status?: string;
  estado?: string;
  colaboradorId?: string;
  busca?: string;
  /** Só itens livres para entrega: em estoque e sem alocação ativa. */
  disponiveis?: boolean;
  all?: boolean;
}

export interface UsuarioAtual {
  id: string;
  role: string;
}

/** Valor vindo da query: desconhecido vira filtro nenhum, não erro 500. */
function enumValido<T extends Record<string, string>>(mapa: T, valor: string | undefined): T[keyof T] | undefined {
  return valor && valor in mapa ? (valor as T[keyof T]) : undefined;
}

/**
 * Some a identidade de quem está com o item pra quem consulta sem ser ADMIN
 * nem o próprio colaborador — a lista de inventário é liberada pela rotina,
 * mas o nome de outra pessoa não é assunto de quem só está vendo o estoque.
 */
export function redigirColaborador<
  T extends { colaboradorId: string; colaborador: { id: string; nome: string; email: string } },
>(alocacao: T, usuarioAtual?: UsuarioAtual): T {
  if (!usuarioAtual || usuarioAtual.role === 'ADMIN' || alocacao.colaboradorId === usuarioAtual.id) return alocacao;
  return { ...alocacao, colaboradorId: '', colaborador: { ...alocacao.colaborador, id: '', nome: '', email: '' } };
}

@Injectable()
export class EquipamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filtros: FiltrosEquipamento = {}, usuarioAtual?: UsuarioAtual) {
    const termo = filtros.busca?.trim();
    const equipamentos = await this.prisma.equipamento.findMany({
      where: {
        ativo: filtros.all ? undefined : true,
        tipoId: filtros.tipoId,
        estado: enumValido(EstadoEquipamento, filtros.estado),
        // "Disponíveis" é mais forte que um filtro de status: manda ESTOQUE e
        // exige que nenhuma alocação ativa esteja segurando o item.
        status: filtros.disponiveis ? EquipamentoStatus.ESTOQUE : enumValido(EquipamentoStatus, filtros.status),
        alocacoes: filtros.disponiveis
          ? { none: { status: { in: [...STATUS_ALOCACAO_ATIVA] } } }
          : filtros.colaboradorId
            ? { some: { colaboradorId: filtros.colaboradorId, status: { in: [...STATUS_ALOCACAO_ATIVA] } } }
            : undefined,
        OR: termo
          ? [
              { numero: { contains: termo, mode: 'insensitive' } },
              { numeroSerie: { contains: termo, mode: 'insensitive' } },
              { marca: { contains: termo, mode: 'insensitive' } },
              { modelo: { contains: termo, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ tipo: { nome: 'asc' } }, { numero: 'asc' }, { criadoEm: 'asc' }],
      include: EQUIPAMENTO_INCLUDE,
    });
    return equipamentos.map((eq) => ({
      ...eq,
      alocacoes: eq.alocacoes.map((alocacao) => redigirColaborador(alocacao, usuarioAtual)),
    }));
  }

  async findOne(id: string, usuarioAtual?: UsuarioAtual) {
    const equipamento = await this.prisma.equipamento.findUnique({ where: { id }, include: EQUIPAMENTO_INCLUDE });
    if (!equipamento) throw new NotFoundException('Equipamento não encontrado');
    return {
      ...equipamento,
      alocacoes: equipamento.alocacoes.map((alocacao) => redigirColaborador(alocacao, usuarioAtual)),
    };
  }

  /** Contadores por situação, para o cabeçalho do inventário. */
  async resumo() {
    const linhas = await this.prisma.equipamento.groupBy({
      by: ['status'],
      where: { ativo: true },
      _count: { _all: true },
    });

    const porStatus = Object.fromEntries(Object.values(EquipamentoStatus).map((status) => [status, 0])) as Record<
      EquipamentoStatus,
      number
    >;
    for (const linha of linhas) porStatus[linha.status] = linha._count._all;

    return {
      total: linhas.reduce((soma, linha) => soma + linha._count._all, 0),
      porStatus,
    };
  }

  async create(dto: CreateEquipamentoDto) {
    await this.garantirTipoAtivo(dto.tipoId);
    try {
      return await this.prisma.equipamento.create({
        data: {
          tipoId: dto.tipoId,
          numero: dto.numero?.trim() || null,
          numeroSerie: dto.numeroSerie?.trim() || null,
          marca: dto.marca?.trim() || null,
          modelo: dto.modelo?.trim() || null,
          estado: dto.estado,
          status: dto.status,
          dataAquisicao: dto.dataAquisicao ? new Date(dto.dataAquisicao) : null,
          valorAquisicao: dto.valorAquisicao ?? null,
          observacoes: dto.observacoes?.trim() || null,
        },
        include: EQUIPAMENTO_INCLUDE,
      });
    } catch (erro) {
      throw this.traduzirIdentificadorDuplicado(erro);
    }
  }

  async update(id: string, dto: UpdateEquipamentoDto) {
    const atual = await this.findOne(id);
    if (dto.tipoId && dto.tipoId !== atual.tipoId) await this.garantirTipoAtivo(dto.tipoId);

    // A situação de um item em uso é consequência da alocação, não da edição
    // manual: liberar isso aqui faria o inventário mentir sobre quem tem o quê.
    if (dto.status && dto.status !== atual.status && atual.alocacoes.length > 0) {
      throw new ConflictException(
        'Este equipamento está com um colaborador: registre a devolução antes de mudar a situação dele',
      );
    }

    try {
      return await this.prisma.equipamento.update({
        where: { id },
        data: {
          tipoId: dto.tipoId,
          numero: dto.numero === undefined ? undefined : dto.numero.trim() || null,
          numeroSerie: dto.numeroSerie === undefined ? undefined : dto.numeroSerie.trim() || null,
          marca: dto.marca === undefined ? undefined : dto.marca.trim() || null,
          modelo: dto.modelo === undefined ? undefined : dto.modelo.trim() || null,
          estado: dto.estado,
          status: dto.status,
          dataAquisicao:
            dto.dataAquisicao === undefined ? undefined : dto.dataAquisicao ? new Date(dto.dataAquisicao) : null,
          valorAquisicao: dto.valorAquisicao === undefined ? undefined : dto.valorAquisicao,
          observacoes: dto.observacoes === undefined ? undefined : dto.observacoes.trim() || null,
          ativo: dto.ativo,
        },
        include: EQUIPAMENTO_INCLUDE,
      });
    } catch (erro) {
      throw this.traduzirIdentificadorDuplicado(erro);
    }
  }

  async remove(id: string) {
    const equipamento = await this.findOne(id);
    if (equipamento.alocacoes.length > 0) {
      throw new ConflictException(
        'Este equipamento está com um colaborador: registre a devolução antes de desativá-lo',
      );
    }
    return this.prisma.equipamento.update({ where: { id }, data: { ativo: false }, include: EQUIPAMENTO_INCLUDE });
  }

  /**
   * Exclusão definitiva. Item que já passou por alguém não sai: o histórico de
   * quem usou o quê precisa continuar legível.
   */
  async deletePermanently(id: string) {
    const equipamento = await this.prisma.equipamento.findUnique({
      where: { id },
      include: { _count: { select: { alocacoes: true } } },
    });
    if (!equipamento) throw new NotFoundException('Equipamento não encontrado');
    if (equipamento._count.alocacoes > 0) {
      throw new ConflictException(
        'Não é possível excluir este equipamento porque existem registros de entrega vinculados a ele',
      );
    }

    await this.prisma.equipamento.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Recusa entregar o que ainda não chegou, está em manutenção ou foi baixado.
   * Fica aqui, e não no fluxo de alocação, porque é uma regra do próprio item.
   */
  garantirEntregavel(equipamento: { status: EquipamentoStatus; ativo: boolean }) {
    if (!equipamento.ativo) {
      throw new BadRequestException('Este equipamento está desativado');
    }
    if (STATUS_NAO_ENTREGAVEIS.includes(equipamento.status)) {
      throw new BadRequestException(`Um equipamento em ${ROTULO_STATUS[equipamento.status]} não pode ser entregue`);
    }
  }

  private async garantirTipoAtivo(tipoId: string) {
    const tipo = await this.prisma.tipoEquipamento.findUnique({ where: { id: tipoId } });
    if (!tipo) throw new NotFoundException('Tipo de equipamento não encontrado');
    if (!tipo.ativo) throw new BadRequestException('Este tipo de equipamento está desativado');
  }

  private traduzirIdentificadorDuplicado(erro: unknown): unknown {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      const alvo = (erro.meta?.target as string[] | undefined)?.join(', ') ?? '';
      const campo = alvo.includes('numeroSerie') ? 'número de série' : 'número de patrimônio';
      return new ConflictException(`Já existe um equipamento com esse ${campo}`);
    }
    return erro;
  }
}
