import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.group.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
      include: { responsavel: { select: { id: true, nome: true } } },
    });
  }

  create(dto: CreateGroupDto) {
    return this.prisma.group.create({ data: dto });
  }

  async update(id: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Departamento não encontrado');
    return this.prisma.group.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Departamento não encontrado');
    return this.prisma.group.update({ where: { id }, data: { ativo: false } });
  }

  async deletePermanently(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!group) throw new NotFoundException('Departamento não encontrado');
    if (group._count.users > 0) {
      throw new ConflictException('Não é possível excluir este departamento porque existem usuários registrados vinculados');
    }

    await this.prisma.group.delete({ where: { id } });
    return { success: true };
  }
}
