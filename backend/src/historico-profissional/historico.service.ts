import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHistoricoDto, UpdateHistoricoDto } from './dto/historico.dto';

@Injectable()
export class HistoricoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.historicoProfissional.findMany({ where: { userId }, orderBy: { dataInicio: 'desc' } });
  }

  create(userId: string, dto: CreateHistoricoDto) {
    return this.prisma.historicoProfissional.create({
      data: {
        userId,
        cargo: dto.cargo,
        departamento: dto.departamento,
        dataInicio: new Date(dto.dataInicio),
        dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
        observacao: dto.observacao,
      },
    });
  }

  async update(id: string, dto: UpdateHistoricoDto) {
    const existente = await this.prisma.historicoProfissional.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Registro de histórico não encontrado');
    return this.prisma.historicoProfissional.update({
      where: { id },
      data: {
        cargo: dto.cargo,
        departamento: dto.departamento,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
        dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
        observacao: dto.observacao,
      },
    });
  }

  async remove(id: string) {
    const existente = await this.prisma.historicoProfissional.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Registro de histórico não encontrado');
    await this.prisma.historicoProfissional.delete({ where: { id } });
    return { success: true };
  }
}
