import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  HorarioDisponivel,
  dataUtc,
  emMinutos,
  horariosDoDia,
  janelasConflitantes,
} from './disponibilidade.util';
import { CreateSalaDto, DisponibilidadeDto, UpdateSalaDto } from './dto/sala.dto';

const SALA_INCLUDE = {
  disponibilidades: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
} as const satisfies Prisma.SalaInclude;

/** Reserva que ainda ocupa o horário: só o cancelamento libera a sala. */
export const STATUS_QUE_OCUPAM = ['SOLICITADA', 'CONFIRMADA'] as const;

@Injectable()
export class SalasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.sala.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
      include: SALA_INCLUDE,
    });
  }

  async findOne(id: string) {
    const sala = await this.prisma.sala.findUnique({ where: { id }, include: SALA_INCLUDE });
    if (!sala) throw new NotFoundException('Sala não encontrada');
    return sala;
  }

  async create(dto: CreateSalaDto) {
    const nome = this.validarNome(dto.nome);
    const disponibilidades = this.validarJanelas(dto.disponibilidades);
    try {
      return await this.prisma.sala.create({
        data: {
          nome,
          localizacao: dto.localizacao?.trim() || null,
          capacidade: dto.capacidade ?? null,
          observacoes: dto.observacoes?.trim() || null,
          disponibilidades: { create: disponibilidades },
        },
        include: SALA_INCLUDE,
      });
    } catch (erro) {
      throw this.traduzirNomeDuplicado(erro);
    }
  }

  /**
   * `disponibilidades` ausente preserva a agenda atual; presente substitui a
   * grade inteira — é assim que a tela edita as janelas.
   */
  async update(id: string, dto: UpdateSalaDto) {
    await this.findOne(id);
    const nome = dto.nome === undefined ? undefined : this.validarNome(dto.nome);
    const disponibilidades = dto.disponibilidades ? this.validarJanelas(dto.disponibilidades) : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (disponibilidades) {
          await tx.salaDisponibilidade.deleteMany({ where: { salaId: id } });
          await tx.salaDisponibilidade.createMany({
            data: disponibilidades.map((janela) => ({ ...janela, salaId: id })),
          });
        }
        return tx.sala.update({
          where: { id },
          data: {
            nome,
            localizacao: dto.localizacao === undefined ? undefined : dto.localizacao.trim() || null,
            capacidade: dto.capacidade === undefined ? undefined : dto.capacidade,
            observacoes: dto.observacoes === undefined ? undefined : dto.observacoes.trim() || null,
            ativo: dto.ativo,
          },
          include: SALA_INCLUDE,
        });
      });
    } catch (erro) {
      throw this.traduzirNomeDuplicado(erro);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sala.update({ where: { id }, data: { ativo: false }, include: SALA_INCLUDE });
  }

  /**
   * Exclusão definitiva. Sala com reserva registrada não sai: o histórico de
   * quem reservou o quê precisa continuar legível.
   */
  async deletePermanently(id: string) {
    const sala = await this.prisma.sala.findUnique({
      where: { id },
      include: { _count: { select: { reservas: true } } },
    });
    if (!sala) throw new NotFoundException('Sala não encontrada');
    if (sala._count.reservas > 0) {
      throw new ConflictException('Não é possível excluir esta sala porque existem reservas registradas nela');
    }

    await this.prisma.sala.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Horários da sala num dia, já marcando como indisponível o que foi tomado.
   * `ignorarReservaId` deixa a própria reserva fora da conta ao editá-la.
   */
  async horariosDisponiveis(salaId: string, data: string, ignorarReservaId?: string): Promise<HorarioDisponivel[]> {
    const sala = await this.findOne(salaId);
    const ocupados = await this.prisma.reserva.findMany({
      where: {
        salaId,
        data: dataUtc(data),
        status: { in: [...STATUS_QUE_OCUPAM] },
        id: ignorarReservaId ? { not: ignorarReservaId } : undefined,
      },
      select: { horaInicio: true, horaFim: true },
    });

    return horariosDoDia(sala.disponibilidades, data, ocupados);
  }

  private validarNome(nome: string): string {
    const limpo = nome.trim();
    if (!limpo) throw new BadRequestException('Informe o nome da sala');
    return limpo;
  }

  private validarJanelas(janelas: DisponibilidadeDto[] | undefined) {
    const normalizadas = (janelas ?? []).map((janela) => ({
      diaSemana: janela.diaSemana,
      horaInicio: janela.horaInicio,
      horaFim: janela.horaFim,
      duracaoMinutos: janela.duracaoMinutos ?? 60,
    }));

    for (const janela of normalizadas) {
      if (emMinutos(janela.horaFim) <= emMinutos(janela.horaInicio)) {
        throw new BadRequestException('O fim da janela precisa ser depois do início');
      }
      if (janela.duracaoMinutos > emMinutos(janela.horaFim) - emMinutos(janela.horaInicio)) {
        throw new BadRequestException('A duração do horário não cabe na janela informada');
      }
    }
    if (janelasConflitantes(normalizadas)) {
      throw new BadRequestException('Há janelas de disponibilidade sobrepostas no mesmo dia da semana');
    }

    return normalizadas;
  }

  private traduzirNomeDuplicado(erro: unknown): unknown {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      return new ConflictException('Já existe uma sala com esse nome');
    }
    return erro;
  }
}
