import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoEquipamentoDto, UpdateTipoEquipamentoDto } from './dto/tipo-equipamento.dto';

@Injectable()
export class TiposEquipamentoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.tipoEquipamento.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { equipamentos: true } } },
    });
  }

  async findOne(id: string) {
    const tipo = await this.prisma.tipoEquipamento.findUnique({
      where: { id },
      include: { _count: { select: { equipamentos: true } } },
    });
    if (!tipo) throw new NotFoundException('Tipo de equipamento não encontrado');
    return tipo;
  }

  async create(dto: CreateTipoEquipamentoDto) {
    try {
      return await this.prisma.tipoEquipamento.create({
        data: {
          nome: this.validarNome(dto.nome),
          descricao: dto.descricao?.trim() || null,
          exigeTermo: dto.exigeTermo,
        },
        include: { _count: { select: { equipamentos: true } } },
      });
    } catch (erro) {
      throw this.traduzirNomeDuplicado(erro);
    }
  }

  async update(id: string, dto: UpdateTipoEquipamentoDto) {
    await this.findOne(id);
    try {
      return await this.prisma.tipoEquipamento.update({
        where: { id },
        data: {
          nome: dto.nome === undefined ? undefined : this.validarNome(dto.nome),
          descricao: dto.descricao === undefined ? undefined : dto.descricao.trim() || null,
          exigeTermo: dto.exigeTermo,
          ativo: dto.ativo,
        },
        include: { _count: { select: { equipamentos: true } } },
      });
    } catch (erro) {
      throw this.traduzirNomeDuplicado(erro);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tipoEquipamento.update({
      where: { id },
      data: { ativo: false },
      include: { _count: { select: { equipamentos: true } } },
    });
  }

  /**
   * Exclusão definitiva. Tipo com equipamento cadastrado não sai: o inventário
   * ficaria sem categoria. Desative-o para tirá-lo dos novos cadastros.
   */
  async deletePermanently(id: string) {
    const tipo = await this.findOne(id);
    if (tipo._count.equipamentos > 0) {
      throw new ConflictException(
        'Não é possível excluir este tipo porque existem equipamentos cadastrados nele',
      );
    }
    await this.prisma.tipoEquipamento.delete({ where: { id } });
    return { success: true };
  }

  private validarNome(nome: string): string {
    const limpo = nome.trim();
    if (!limpo) throw new BadRequestException('Informe o nome do tipo de equipamento');
    return limpo;
  }

  private traduzirNomeDuplicado(erro: unknown): unknown {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      return new ConflictException('Já existe um tipo de equipamento com esse nome');
    }
    return erro;
  }
}
