import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';

@Injectable()
export class TurnosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.turno.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  create(dto: CreateTurnoDto) {
    return this.prisma.turno.create({ data: dto });
  }

  async update(id: string, dto: UpdateTurnoDto) {
    const turno = await this.prisma.turno.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException('Turno não encontrado');
    return this.prisma.turno.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const turno = await this.prisma.turno.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException('Turno não encontrado');
    return this.prisma.turno.update({ where: { id }, data: { ativo: false } });
  }

  async deletePermanently(id: string) {
    const turno = await this.prisma.turno.findUnique({
      where: { id },
      include: { _count: { select: { plantoes: true } } },
    });
    if (!turno) throw new NotFoundException('Turno não encontrado');
    if (turno._count.plantoes > 0) {
      throw new ConflictException('Não é possível excluir este turno porque existem plantões vinculados a ele');
    }

    await this.prisma.turno.delete({ where: { id } });
    return { success: true };
  }
}
