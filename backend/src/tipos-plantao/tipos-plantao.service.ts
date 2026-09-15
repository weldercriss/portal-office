import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoPlantaoDto } from './dto/create-tipo-plantao.dto';
import { UpdateTipoPlantaoDto } from './dto/update-tipo-plantao.dto';

@Injectable()
export class TiposPlantaoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.tipoPlantao.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  create(dto: CreateTipoPlantaoDto) {
    return this.prisma.tipoPlantao.create({ data: dto });
  }

  async update(id: string, dto: UpdateTipoPlantaoDto) {
    const tipo = await this.prisma.tipoPlantao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de plantão não encontrado');
    return this.prisma.tipoPlantao.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const tipo = await this.prisma.tipoPlantao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de plantão não encontrado');
    return this.prisma.tipoPlantao.update({ where: { id }, data: { ativo: false } });
  }

  async deletePermanently(id: string) {
    const tipo = await this.prisma.tipoPlantao.findUnique({
      where: { id },
      include: { _count: { select: { plantoes: true, series: true } } },
    });
    if (!tipo) throw new NotFoundException('Tipo de plantão não encontrado');
    if (tipo._count.plantoes > 0 || tipo._count.series > 0) {
      throw new ConflictException('Não é possível excluir este tipo porque existem plantões vinculados a ele');
    }

    await this.prisma.tipoPlantao.delete({ where: { id } });
    return { success: true };
  }
}
