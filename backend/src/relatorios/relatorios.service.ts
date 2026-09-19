import { Injectable } from '@nestjs/common';
import { anosCompletosEm } from '../common/datas.util';
import { PrismaService } from '../prisma/prisma.service';

interface FiltroTurnover {
  /** "AAAA-MM", inclusive. */
  de?: string;
  ate?: string;
  departamentoId?: string;
}

interface FiltroColaboradores {
  departamentoId?: string;
}

function chaveMes(data: Date): string {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Ordena por dia no calendário (mês/dia), ignorando o ano — é assim que faz sentido ler uma lista de aniversariantes. */
function porDiaNoCalendario(data: Date): number {
  return data.getUTCMonth() * 100 + data.getUTCDate();
}

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Visão completa de colaboradores para relatório: totais por departamento e as
   * listas inteiras de aniversariantes/aniversários de casa (sem a janela de 60 dias
   * nem o limite de itens que o dashboard usa para "próximos eventos").
   */
  async getColaboradores({ departamentoId }: FiltroColaboradores) {
    const colaboradores = await this.prisma.user.findMany({
      where: { ativo: true, statusColaborador: { not: 'PENDENTE' }, groupId: departamentoId || undefined },
      select: {
        id: true,
        nome: true,
        dataNascimento: true,
        dataAdmissao: true,
        group: { select: { id: true, nome: true } },
      },
    });

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

    const aniversariantesPorMes = Array.from({ length: 12 }, (_, mes) => ({ mes, total: 0 }));
    const hoje = new Date();

    const aniversariantes = colaboradores
      .filter((c) => c.dataNascimento)
      .map((c) => {
        aniversariantesPorMes[(c.dataNascimento as Date).getUTCMonth()].total += 1;
        return {
          id: c.id,
          nome: c.nome,
          departamento: c.group?.nome ?? 'Sem departamento',
          data: c.dataNascimento as Date,
        };
      })
      .sort((a, b) => porDiaNoCalendario(a.data) - porDiaNoCalendario(b.data));

    const aniversariosCasa = colaboradores
      .filter((c) => c.dataAdmissao)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        departamento: c.group?.nome ?? 'Sem departamento',
        data: c.dataAdmissao as Date,
        anos: anosCompletosEm(c.dataAdmissao as Date, hoje),
      }))
      .sort((a, b) => porDiaNoCalendario(a.data) - porDiaNoCalendario(b.data));

    return {
      totalColaboradores: colaboradores.length,
      porDepartamento: Array.from(porDepartamentoMap.values()).sort((a, b) => b.total - a.total),
      aniversariantesPorMes,
      aniversariantes,
      aniversariosCasa,
    };
  }

  /** Carrega em memória quem tem admissão ou desligamento e agrupa por mês — sem tabela própria, é derivado de User. */
  async getTurnover({ de, ate, departamentoId }: FiltroTurnover) {
    const usuarios = await this.prisma.user.findMany({
      where: {
        role: { not: 'MASTER' },
        statusColaborador: { not: 'PENDENTE' },
        groupId: departamentoId || undefined,
        OR: [{ dataAdmissao: { not: null } }, { dataDesligamento: { not: null } }],
      },
      select: { dataAdmissao: true, dataDesligamento: true },
    });

    const dentroDoIntervalo = (chave: string) => (!de || chave >= de) && (!ate || chave <= ate);
    const porMes = new Map<string, { mes: string; admissoes: number; desligamentos: number }>();
    const acumular = (chave: string, campo: 'admissoes' | 'desligamentos') => {
      const atual = porMes.get(chave) ?? { mes: chave, admissoes: 0, desligamentos: 0 };
      atual[campo] += 1;
      porMes.set(chave, atual);
    };

    for (const usuario of usuarios) {
      if (usuario.dataAdmissao) {
        const chave = chaveMes(usuario.dataAdmissao);
        if (dentroDoIntervalo(chave)) acumular(chave, 'admissoes');
      }
      if (usuario.dataDesligamento) {
        const chave = chaveMes(usuario.dataDesligamento);
        if (dentroDoIntervalo(chave)) acumular(chave, 'desligamentos');
      }
    }

    return Array.from(porMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }
}
