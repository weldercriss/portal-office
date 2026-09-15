import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependenteDto, UpdateDependenteDto } from './dto/dependente.dto';

@Injectable()
export class DependentesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.dependente.findMany({ where: { userId }, orderBy: { nome: 'asc' } });
  }

  create(userId: string, dto: CreateDependenteDto) {
    return this.prisma.dependente.create({
      data: {
        userId,
        nome: dto.nome,
        parentesco: dto.parentesco,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateDependenteDto) {
    const existente = await this.prisma.dependente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Dependente não encontrado');
    return this.prisma.dependente.update({
      where: { id },
      data: {
        nome: dto.nome,
        parentesco: dto.parentesco,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      },
    });
  }

  async remove(id: string) {
    const existente = await this.prisma.dependente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Dependente não encontrado');
    await this.prisma.dependente.delete({ where: { id } });
    return { success: true };
  }
}
