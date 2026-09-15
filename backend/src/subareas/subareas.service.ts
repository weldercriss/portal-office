import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubAreaDto } from './dto/create-subarea.dto';
import { UpdateSubAreaDto } from './dto/update-subarea.dto';

@Injectable()
export class SubAreasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(groupId?: string, all = false) {
    return this.prisma.subArea.findMany({
      where: {
        ...(all ? {} : { ativo: true }),
        ...(groupId ? { groupId } : {}),
      },
      orderBy: { nome: 'asc' },
    });
  }

  create(dto: CreateSubAreaDto) {
    return this.prisma.subArea.create({ data: dto });
  }

  async update(id: string, dto: UpdateSubAreaDto) {
    const subArea = await this.prisma.subArea.findUnique({ where: { id } });
    if (!subArea) throw new NotFoundException('Sub-área não encontrada');
    return this.prisma.subArea.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const subArea = await this.prisma.subArea.findUnique({ where: { id } });
    if (!subArea) throw new NotFoundException('Sub-área não encontrada');
    return this.prisma.subArea.update({ where: { id }, data: { ativo: false } });
  }

  async deletePermanently(id: string) {
    const subArea = await this.prisma.subArea.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!subArea) throw new NotFoundException('Sub-área não encontrada');
    if (subArea._count.users > 0) {
      throw new ConflictException('Não é possível excluir esta sub-área porque existem colaboradores vinculados');
    }

    await this.prisma.subArea.delete({ where: { id } });
    return { success: true };
  }
}
