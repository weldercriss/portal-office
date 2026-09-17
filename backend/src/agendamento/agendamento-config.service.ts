import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAgendamentoConfigDto } from './dto/agendamento-config.dto';

const CONFIG_ID = 'global';

export interface AgendamentoConfigPublica {
  permiteSolicitacaoColaborador: boolean;
}

@Injectable()
export class AgendamentoConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AgendamentoConfigPublica> {
    const config = await this.prisma.agendamentoConfig.findUnique({ where: { id: CONFIG_ID } });
    return { permiteSolicitacaoColaborador: config?.permiteSolicitacaoColaborador ?? false };
  }

  async update(dto: UpdateAgendamentoConfigDto): Promise<AgendamentoConfigPublica> {
    const config = await this.prisma.agendamentoConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, permiteSolicitacaoColaborador: dto.permiteSolicitacaoColaborador },
      update: { permiteSolicitacaoColaborador: dto.permiteSolicitacaoColaborador },
    });
    return { permiteSolicitacaoColaborador: config.permiteSolicitacaoColaborador };
  }

  async permiteSolicitacaoColaborador(): Promise<boolean> {
    return (await this.get()).permiteSolicitacaoColaborador;
  }
}
