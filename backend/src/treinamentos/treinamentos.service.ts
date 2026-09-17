import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTreinamentoDto, UpdateParticipacaoDto } from './dto/treinamento.dto';

const INCLUDE_PARTICIPANTES = {
  participantes: { include: { user: { select: { id: true, nome: true } } } },
} as const;

@Injectable()
export class TreinamentosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.treinamento.findMany({ orderBy: { criadoEm: 'desc' }, include: INCLUDE_PARTICIPANTES });
  }

  findMeus(userId: string) {
    return this.prisma.treinamento.findMany({
      where: { participantes: { some: { userId } } },
      orderBy: { criadoEm: 'desc' },
      include: INCLUDE_PARTICIPANTES,
    });
  }

  create(dto: CreateTreinamentoDto) {
    return this.prisma.treinamento.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        participantes: { create: dto.participanteIds.map((userId) => ({ userId })) },
      },
      include: INCLUDE_PARTICIPANTES,
    });
  }

  async remove(id: string) {
    const existente = await this.prisma.treinamento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Treinamento não encontrado');
    await this.prisma.treinamento.delete({ where: { id } });
    return { success: true };
  }

  async atualizarParticipacao(
    treinamentoId: string,
    userId: string,
    dto: UpdateParticipacaoDto,
    solicitante: { id: string; role: string },
  ) {
    if (!ehAdminOuSuperior(solicitante.role) && solicitante.id !== userId) {
      throw new ForbiddenException('Você só pode atualizar sua própria participação');
    }
    const participacao = await this.prisma.treinamentoParticipante.findUnique({
      where: { treinamentoId_userId: { treinamentoId, userId } },
    });
    if (!participacao) throw new NotFoundException('Participação não encontrada');
    return this.prisma.treinamentoParticipante.update({
      where: { treinamentoId_userId: { treinamentoId, userId } },
      data: { status: dto.status, concluidoEm: dto.status === 'CONCLUIDO' ? new Date() : null },
    });
  }
}
