import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RegraRecorrenciaPlantao } from '@prisma/client';
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

  async create(dto: CreateTipoPlantaoDto, criadoPorId: string) {
    this.validarDiasSemana(dto.regra, dto.diasSemana);
    return this.prisma.tipoPlantao.create({ data: { ...dto, criadoPorId } });
  }

  async update(id: string, dto: UpdateTipoPlantaoDto, criadoPorId: string) {
    const tipo = await this.prisma.tipoPlantao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de plantão não encontrado');
    this.validarDiasSemana(dto.regra ?? tipo.regra, dto.diasSemana ?? tipo.diasSemana);
    return this.prisma.tipoPlantao.update({ where: { id }, data: { ...dto, criadoPorId } });
  }

  private validarDiasSemana(regra: RegraRecorrenciaPlantao, diasSemana?: number[]) {
    if (regra === RegraRecorrenciaPlantao.SEMANAL && !diasSemana?.length) {
      throw new BadRequestException('Selecione ao menos um dia da semana para a recorrência semanal');
    }
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
