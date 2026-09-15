import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CampoFormularioDto } from '../common/dto/campo-formulario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateFormularioDto } from './dto/create-template-formulario.dto';

@Injectable()
export class TemplatesFormularioService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.templateFormulario.findMany({ orderBy: { nome: 'asc' } });
  }

  create(dto: CreateTemplateFormularioDto) {
    return this.prisma.templateFormulario.create({
      data: { nome: dto.nome, campos: this.normalizarCampos(dto.campos) },
    });
  }

  async remove(id: string) {
    const template = await this.prisma.templateFormulario.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    await this.prisma.templateFormulario.delete({ where: { id } });
    return { success: true };
  }

  private normalizarCampos(campos: CampoFormularioDto[]) {
    return campos.map((campo) => ({ ...campo, id: campo.id ?? randomUUID() }));
  }
}
