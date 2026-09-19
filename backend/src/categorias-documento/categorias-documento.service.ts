import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDocumentoDto, UpdateCategoriaDocumentoDto } from './dto/categoria-documento.dto';

@Injectable()
export class CategoriasDocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.categoriaDocumento.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { documentos: true } } },
    });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoriaDocumento.findUnique({
      where: { id },
      include: { _count: { select: { documentos: true } } },
    });
    if (!categoria) throw new NotFoundException('Categoria de documento não encontrada');
    return categoria;
  }

  async create(dto: CreateCategoriaDocumentoDto) {
    try {
      return await this.prisma.categoriaDocumento.create({
        data: { nome: this.validarNome(dto.nome) },
        include: { _count: { select: { documentos: true } } },
      });
    } catch (erro) {
      throw this.traduzirNomeDuplicado(erro);
    }
  }

  async update(id: string, dto: UpdateCategoriaDocumentoDto) {
    await this.findOne(id);
    try {
      return await this.prisma.categoriaDocumento.update({
        where: { id },
        data: {
          nome: dto.nome === undefined ? undefined : this.validarNome(dto.nome),
          ativo: dto.ativo,
        },
        include: { _count: { select: { documentos: true } } },
      });
    } catch (erro) {
      throw this.traduzirNomeDuplicado(erro);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.categoriaDocumento.update({
      where: { id },
      data: { ativo: false },
      include: { _count: { select: { documentos: true } } },
    });
  }

  /**
   * Exclusão definitiva. Categoria com documento cadastrado não sai: o
   * documento ficaria sem categoria. Desative-a para tirá-la dos novos uploads.
   */
  async deletePermanently(id: string) {
    const categoria = await this.findOne(id);
    if (categoria._count.documentos > 0) {
      throw new ConflictException('Não é possível excluir esta categoria porque existem documentos cadastrados nela');
    }
    await this.prisma.categoriaDocumento.delete({ where: { id } });
    return { success: true };
  }

  private validarNome(nome: string): string {
    const limpo = nome.trim();
    if (!limpo) throw new BadRequestException('Informe o nome da categoria');
    return limpo;
  }

  private traduzirNomeDuplicado(erro: unknown): unknown {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      return new ConflictException('Já existe uma categoria de documento com esse nome');
    }
    return erro;
  }
}
