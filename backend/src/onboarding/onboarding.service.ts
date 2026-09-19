import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoChecklist } from '@prisma/client';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { garantirAcessoColaborador } from '../common/acesso-colaborador.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

export const ITENS_CHECKLIST_ADMISSAO_PADRAO = [
  { categoria: 'Documentação', titulo: 'Solicitação de documentos' },
  { categoria: 'Documentação', titulo: 'Assinatura de documentos' },
  { categoria: 'Acessos e equipamentos', titulo: 'Criação de acessos' },
  { categoria: 'Acessos e equipamentos', titulo: 'Equipamentos' },
  { categoria: 'Apresentação da empresa', titulo: 'Apresentação da empresa' },
  { categoria: 'Onboarding', titulo: 'Treinamentos iniciais' },
  { categoria: 'Onboarding', titulo: 'Acompanhamento dos primeiros dias' },
];

export const ITENS_CHECKLIST_DESLIGAMENTO_PADRAO = [
  { categoria: null, titulo: 'Devolução de patrimônio' },
  { categoria: null, titulo: 'Exame demissional' },
  { categoria: null, titulo: 'Acerto de contas' },
  { categoria: null, titulo: 'Entrevista de desligamento' },
  { categoria: null, titulo: 'Revogação de acessos' },
];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, chamador: UsuarioAutenticado, tipo?: TipoChecklist) {
    let gestorIdDoAlvo: string | null = null;
    if (chamador.role === 'GESTOR' && chamador.id !== userId) {
      const alvo = await this.prisma.user.findUnique({ where: { id: userId }, select: { gestorId: true } });
      gestorIdDoAlvo = alvo?.gestorId ?? null;
    }
    garantirAcessoColaborador(chamador, userId, gestorIdDoAlvo);

    const itens = await this.prisma.checklistItem.findMany({
      where: { userId, tipo },
      orderBy: { criadoEm: 'asc' },
    });
    if (ehAdminOuSuperior(chamador.role)) return itens;
    // undefined (não null) some do JSON de resposta, mas mantém o tipo do array consistente.
    return itens.map((item) => ({ ...item, observacaoInterna: undefined }));
  }

  create(userId: string, dto: CreateChecklistItemDto) {
    return this.prisma.checklistItem.create({
      data: { userId, titulo: dto.titulo, tipo: dto.tipo, categoria: dto.categoria },
    });
  }

  gerarPadrao(userId: string, tipo: TipoChecklist = TipoChecklist.ADMISSAO) {
    const itens = tipo === TipoChecklist.DESLIGAMENTO ? ITENS_CHECKLIST_DESLIGAMENTO_PADRAO : ITENS_CHECKLIST_ADMISSAO_PADRAO;
    return this.prisma.checklistItem.createMany({
      data: itens.map((item) => ({ userId, tipo, categoria: item.categoria, titulo: item.titulo })),
    });
  }

  async update(id: string, dto: UpdateChecklistItemDto) {
    const existente = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Item do checklist não encontrado');
    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        status: dto.status,
        observacaoInterna: dto.observacaoInterna,
        concluidoEm: dto.status === 'CONCLUIDO' ? new Date() : dto.status === 'PENDENTE' ? null : undefined,
      },
    });
  }

  async remove(id: string) {
    const existente = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Item do checklist não encontrado');
    await this.prisma.checklistItem.delete({ where: { id } });
    return { success: true };
  }
}
