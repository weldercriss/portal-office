import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RegraRecorrenciaPlantao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { gerarDatasRecorrencia } from './recorrencia.util';

const HORIZONTE_DIAS = 90;

function hojeUtc(): Date {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function somarDias(data: Date, quantidade: number): Date {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

function diasSemanaIguais(a: number[], b: number[]): boolean {
  const setA = [...new Set(a)].sort();
  const setB = [...new Set(b)].sort();
  return setA.length === setB.length && setA.every((dia, i) => dia === setB[i]);
}

/**
 * Mantém a recorrência automática configurada no TipoPlantao: garante uma
 * PlantaoSerie aberta por tipo ativo recorrente e completa as ocorrências
 * futuras sem plantonista, numa janela rolante. Roda uma vez por dia — a
 * escala não precisa da urgência de minuto a minuto do outbox de agenda.
 */
@Injectable()
export class PlantoesRecorrenciaWorker {
  private readonly logger = new Logger(PlantoesRecorrenciaWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async sincronizar(): Promise<void> {
    await this.fecharSeriesOrfas();
    await this.reconciliarSeriesAtivas();
    await this.completarOcorrencias();
  }

  /** Série aberta cujo tipo foi desativado ou deixou de ser recorrente: fecha, o tipo não gera mais nada. */
  private async fecharSeriesOrfas(): Promise<void> {
    const ontem = somarDias(hojeUtc(), -1);
    const orfas = await this.prisma.plantaoSerie.findMany({
      where: { dataFim: null, tipoPlantao: { OR: [{ ativo: false }, { regra: RegraRecorrenciaPlantao.UNICO }] } },
      select: { id: true },
    });
    if (orfas.length === 0) return;
    await this.prisma.plantaoSerie.updateMany({
      where: { id: { in: orfas.map((serie) => serie.id) } },
      data: { dataFim: ontem },
    });
    this.logger.log(`Encerradas ${orfas.length} série(s) órfã(s) (tipo desativado ou não recorrente)`);
  }

  /** Garante uma série aberta por tipo ativo recorrente, refletindo o diasSemana atual do tipo. */
  private async reconciliarSeriesAtivas(): Promise<void> {
    const tipos = await this.prisma.tipoPlantao.findMany({
      where: { ativo: true, regra: { not: RegraRecorrenciaPlantao.UNICO } },
      include: { series: { where: { dataFim: null } } },
    });

    const hoje = hojeUtc();
    for (const tipo of tipos) {
      const serieAberta = tipo.series[0];
      if (serieAberta && diasSemanaIguais(serieAberta.diasSemana, tipo.diasSemana)) continue;

      // Sem autor conhecido (tipo antigo, nunca resalvo pelo admin desde essa feature)
      // não há como abrir a série — reuso o autor da série anterior, se houver, senão espero
      // o admin resalvar o tipo (o `criadoPorId` é preenchido no create/update do tipo).
      const criadoPorId = tipo.criadoPorId ?? serieAberta?.criadoPorId;
      if (!criadoPorId) {
        this.logger.warn(`Tipo ${tipo.id} (${tipo.nome}) é recorrente mas não tem autor registrado — resalve o tipo para ativar a geração automática`);
        continue;
      }

      if (serieAberta) {
        await this.prisma.plantaoSerie.update({
          where: { id: serieAberta.id },
          data: { dataFim: somarDias(hoje, -1) },
        });
      }
      await this.prisma.plantaoSerie.create({
        data: {
          tipoPlantaoId: tipo.id,
          dataInicio: hoje,
          dataFim: null,
          diasSemana: tipo.diasSemana,
          criadoPorId,
        },
      });
    }
  }

  /** Completa, pra cada série aberta, as ocorrências que faltam até a janela rolante. */
  private async completarOcorrencias(): Promise<void> {
    const hoje = hojeUtc();
    const horizonteMax = somarDias(hoje, HORIZONTE_DIAS);
    const series = await this.prisma.plantaoSerie.findMany({
      where: { OR: [{ dataFim: null }, { dataFim: { gte: hoje } }] },
      include: { tipoPlantao: true },
    });

    for (const serie of series) {
      const fim = serie.dataFim && serie.dataFim < horizonteMax ? serie.dataFim : horizonteMax;
      const inicio = serie.dataInicio > hoje ? serie.dataInicio : hoje;
      const datas = gerarDatasRecorrencia(
        serie.tipoPlantao.regra,
        inicio.toISOString().slice(0, 10),
        fim.toISOString().slice(0, 10),
        serie.diasSemana,
      );
      if (datas.length === 0) continue;

      const existentes = await this.prisma.plantao.findMany({
        where: { serieId: serie.id, data: { in: datas.map((d) => new Date(d)) } },
        select: { data: true },
      });
      const jaExistem = new Set(existentes.map((plantao) => plantao.data.toISOString().slice(0, 10)));
      const faltando = datas.filter((data) => !jaExistem.has(data));
      if (faltando.length === 0) continue;

      await this.prisma.plantao.createMany({
        data: faltando.map((data) => ({
          data: new Date(data),
          criadoPorId: serie.criadoPorId,
          tipoPlantaoId: serie.tipoPlantaoId,
          serieId: serie.id,
        })),
      });
      this.logger.log(`Série ${serie.id}: geradas ${faltando.length} ocorrência(s) até ${fim.toISOString().slice(0, 10)}`);
    }
  }
}
