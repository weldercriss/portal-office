import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoSolicitacaoDto } from './dto/create-tipo-solicitacao.dto';
import { UpdateTipoSolicitacaoDto } from './dto/update-tipo-solicitacao.dto';

@Injectable()
export class TiposSolicitacaoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.tipoSolicitacao.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  create(dto: CreateTipoSolicitacaoDto) {
    return this.prisma.tipoSolicitacao.create({ data: dto });
  }

  async update(id: string, dto: UpdateTipoSolicitacaoDto) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de solicitação não encontrado');
    return this.prisma.tipoSolicitacao.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de solicitação não encontrado');
    return this.prisma.tipoSolicitacao.update({ where: { id }, data: { ativo: false } });
  }

  async deletePermanently(id: string) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({
      where: { id },
      include: { _count: { select: { solicitacoes: true } } },
    });
    if (!tipo) throw new NotFoundException('Tipo de solicitação não encontrado');
    if (tipo._count.solicitacoes > 0) {
      throw new ConflictException('Não é possível excluir este tipo porque existem solicitações vinculadas a ele');
    }

    await this.prisma.tipoSolicitacao.delete({ where: { id } });
    return { success: true };
  }
}
