import { Injectable } from '@nestjs/common';
import { ReservaStatus } from '@prisma/client';
import { anosCompletosEm, diasAteProximaOcorrencia } from '../common/datas.util';
import { PrismaService } from '../prisma/prisma.service';

const JANELA_DIAS = 60;
const LIMITE_ITENS = 8;
/** Janela de "próximos agendamentos": hoje e amanhã, para não virar uma agenda inteira. */
const JANELA_AGENDAMENTOS_DIAS = 2;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumoAdmin() {
    const colaboradores = await this.prisma.user.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        dataNascimento: true,
        dataAdmissao: true,
        group: { select: { id: true, nome: true } },
      },
    });

    const hoje = new Date();
    const porDepartamentoMap = new Map<string, { departamentoId: string | null; departamento: string; total: number }>();
    for (const colaborador of colaboradores) {
      const chave = colaborador.group?.id ?? 'sem-departamento';
      const atual = porDepartamentoMap.get(chave) ?? {
        departamentoId: colaborador.group?.id ?? null,
        departamento: colaborador.group?.nome ?? 'Sem departamento',
        total: 0,
      };
      atual.total += 1;
      porDepartamentoMap.set(chave, atual);
    }

    const proximosAniversariantes = colaboradores
      .filter((c) => c.dataNascimento)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        data: c.dataNascimento as Date,
        dias: diasAteProximaOcorrencia(c.dataNascimento as Date, hoje),
      }))
      .filter((c) => c.dias <= JANELA_DIAS)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, LIMITE_ITENS);

    const proximosAniversariosCasa = colaboradores
      .filter((c) => c.dataAdmissao)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        data: c.dataAdmissao as Date,
        dias: diasAteProximaOcorrencia(c.dataAdmissao as Date, hoje),
        anos: anosCompletosEm(c.dataAdmissao as Date, hoje) + 1,
      }))
      .filter((c) => c.dias <= JANELA_DIAS)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, LIMITE_ITENS);

    const agendamentos = await this.getResumoAgendamentos(hoje);

    return {
      totalColaboradores: colaboradores.length,
      porDepartamento: Array.from(porDepartamentoMap.values()).sort((a, b) => b.total - a.total),
      proximosAniversariantes,
      proximosAniversariosCasa,
      agendamentos,
    };
  }

  /**
   * Reservas de sala pendentes de confirmação e as que acontecem hoje/amanhã.
   * Separado do resto do resumo porque é o único bloco que muda ao longo do
   * dia, e não só de um dia para o outro.
   */
  private async getResumoAgendamentos(hoje: Date) {
    const hojeUtc = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    const fimJanela = new Date(hojeUtc);
    fimJanela.setUTCDate(fimJanela.getUTCDate() + JANELA_AGENDAMENTOS_DIAS - 1);

    const [pendentes, proximas] = await Promise.all([
      this.prisma.reserva.count({ where: { status: ReservaStatus.SOLICITADA } }),
      this.prisma.reserva.findMany({
        where: { status: ReservaStatus.CONFIRMADA, data: { gte: hojeUtc, lte: fimJanela } },
        orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
        take: LIMITE_ITENS,
        select: {
          id: true,
          data: true,
          horaInicio: true,
          horaFim: true,
          sala: { select: { nome: true } },
          solicitante: { select: { nome: true } },
        },
      }),
    ]);

    return {
      pendentes,
      proximas: proximas.map((reserva) => ({
        id: reserva.id,
        sala: reserva.sala.nome,
        solicitante: reserva.solicitante.nome,
        data: reserva.data,
        horaInicio: reserva.horaInicio,
        horaFim: reserva.horaFim,
      })),
    };
  }
}
