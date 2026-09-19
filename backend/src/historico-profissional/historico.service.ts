import { Injectable, NotFoundException } from '@nestjs/common';
import { garantirAcessoColaborador } from '../common/acesso-colaborador.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHistoricoDto, UpdateHistoricoDto } from './dto/historico.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@Injectable()
export class HistoricoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, chamador: UsuarioAutenticado) {
    let gestorIdDoAlvo: string | null = null;
    if (chamador.role === 'GESTOR' && chamador.id !== userId) {
      const alvo = await this.prisma.user.findUnique({ where: { id: userId }, select: { gestorId: true } });
      gestorIdDoAlvo = alvo?.gestorId ?? null;
    }
    garantirAcessoColaborador(chamador, userId, gestorIdDoAlvo);
    return this.prisma.historicoProfissional.findMany({ where: { userId }, orderBy: { dataInicio: 'desc' } });
  }

  create(userId: string, dto: CreateHistoricoDto) {
    return this.prisma.historicoProfissional.create({
      data: {
        userId,
        cargo: dto.cargo,
        departamento: dto.externo ? undefined : dto.departamento,
        empresa: dto.externo ? dto.empresa : undefined,
        externo: dto.externo ?? false,
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
        empresa: dto.empresa,
        externo: dto.externo,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
        dataFim: dto.dataFim === null ? null : dto.dataFim ? new Date(dto.dataFim) : undefined,
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
