import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDadosSensiveisDto } from './dto/update-dados-sensiveis.dto';

const SELECT = { tipoSanguineo: true, alergias: true, condicoesSaude: true } as const;

@Injectable()
export class DadosSensiveisService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string) {
    const usuario = await this.prisma.user.findUnique({ where: { id: userId }, select: SELECT });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async update(userId: string, dto: UpdateDadosSensiveisDto) {
    const existente = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existente) throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({ where: { id: userId }, data: dto, select: SELECT });
  }
}
