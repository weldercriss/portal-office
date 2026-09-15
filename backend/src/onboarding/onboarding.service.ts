import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';

export const ITENS_CHECKLIST_PADRAO = [
  'Solicitação de documentos',
  'Assinatura de documentos',
  'Criação de acessos',
  'Equipamentos',
  'Apresentação da empresa',
  'Treinamentos iniciais',
  'Acompanhamento dos primeiros dias',
];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.checklistAdmissaoItem.findMany({ where: { userId }, orderBy: { criadoEm: 'asc' } });
  }

  create(userId: string, dto: CreateChecklistItemDto) {
    return this.prisma.checklistAdmissaoItem.create({ data: { userId, titulo: dto.titulo } });
  }

  gerarPadrao(userId: string) {
    return this.prisma.checklistAdmissaoItem.createMany({
      data: ITENS_CHECKLIST_PADRAO.map((titulo) => ({ userId, titulo })),
    });
  }

  async update(id: string, dto: UpdateChecklistItemDto) {
    const existente = await this.prisma.checklistAdmissaoItem.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Item do checklist não encontrado');
    return this.prisma.checklistAdmissaoItem.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        status: dto.status,
        concluidoEm: dto.status === 'CONCLUIDO' ? new Date() : dto.status === 'PENDENTE' ? null : undefined,
      },
    });
  }

  async remove(id: string) {
    const existente = await this.prisma.checklistAdmissaoItem.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Item do checklist não encontrado');
    await this.prisma.checklistAdmissaoItem.delete({ where: { id } });
    return { success: true };
  }
}
