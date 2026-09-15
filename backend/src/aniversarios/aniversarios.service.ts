import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { diasAteProximaOcorrencia } from '../common/datas.util';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';

const DIAS_ALVO = [5, 3, 2, 1];

@Injectable()
export class AniversariosService {
  private readonly logger = new Logger(AniversariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async verificarAniversariosProximos() {
    const hoje = new Date();
    const destinatarios = await this.prisma.user.findMany({
      where: { ativo: true, recebeAvisosRH: true },
      select: { id: true },
    });
    if (destinatarios.length === 0) return;

    const colaboradores = await this.prisma.user.findMany({
      where: { ativo: true, OR: [{ dataNascimento: { not: null } }, { dataAdmissao: { not: null } }] },
      select: { id: true, nome: true, dataNascimento: true, dataAdmissao: true },
    });

    for (const colaborador of colaboradores) {
      if (colaborador.dataNascimento) {
        const dias = diasAteProximaOcorrencia(colaborador.dataNascimento, hoje);
        if (DIAS_ALVO.includes(dias)) {
          await this.notificarDestinatarios(destinatarios, colaborador.id, {
            tipo: 'ANIVERSARIO_PROXIMO',
            titulo: 'Aniversário próximo',
            mensagem: this.mensagem(colaborador.nome, dias, 'faz aniversário'),
          });
        }
      }
      if (colaborador.dataAdmissao) {
        const dias = diasAteProximaOcorrencia(colaborador.dataAdmissao, hoje);
        if (DIAS_ALVO.includes(dias)) {
          await this.notificarDestinatarios(destinatarios, colaborador.id, {
            tipo: 'ANIVERSARIO_ADMISSAO_PROXIMO',
            titulo: 'Aniversário de tempo de casa próximo',
            mensagem: this.mensagem(colaborador.nome, dias, 'completa tempo de casa'),
          });
        }
      }
    }
    this.logger.log(`Verificação de aniversários concluída (${colaboradores.length} colaboradores avaliados).`);
  }

  private mensagem(nome: string, dias: number, evento: string) {
    const quando = dias === 1 ? 'em 1 dia' : `em ${dias} dias`;
    return `${nome} ${evento} ${quando}.`;
  }

  private async notificarDestinatarios(
    destinatarios: { id: string }[],
    colaboradorId: string,
    dados: { tipo: string; titulo: string; mensagem: string },
  ) {
    await Promise.all(
      destinatarios
        .filter((d) => d.id !== colaboradorId)
        .map((d) =>
          this.notificacoesService.criar({
            userId: d.id,
            tipo: dados.tipo,
            titulo: dados.titulo,
            mensagem: dados.mensagem,
            telegramTexto: `🎉 ${dados.titulo}\n\n${dados.mensagem}`,
            link: '/',
          }),
        ),
    );
  }
}
