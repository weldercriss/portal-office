import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { diasAteProximaOcorrencia } from '../common/datas.util';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConfigAvisoAniversarioDto } from './dto/config-aviso-aniversario.dto';

const CONFIG_ID = 'global';
const DIAS_ALVO_PADRAO = [15, 10, 5, 3, 1];

@Injectable()
export class AniversariosService {
  private readonly logger = new Logger(AniversariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  async getConfig() {
    const config = await this.prisma.configAvisoAniversario.findUnique({ where: { id: CONFIG_ID } });
    return { diasAntecedencia: config?.diasAntecedencia ?? DIAS_ALVO_PADRAO };
  }

  async updateConfig(dto: UpdateConfigAvisoAniversarioDto) {
    const config = await this.prisma.configAvisoAniversario.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, diasAntecedencia: dto.diasAntecedencia },
      update: { diasAntecedencia: dto.diasAntecedencia },
    });
    return { diasAntecedencia: config.diasAntecedencia };
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async verificarAniversariosProximos() {
    const hoje = new Date();
    const { diasAntecedencia } = await this.getConfig();

    const destinatariosRH = await this.prisma.user.findMany({
      where: { ativo: true, recebeAvisosRH: true },
      select: { id: true },
    });
    const idsRH = destinatariosRH.map((d) => d.id);

    const colaboradores = await this.prisma.user.findMany({
      where: {
        ativo: true,
        statusColaborador: { not: 'PENDENTE' },
        OR: [{ dataNascimento: { not: null } }, { dataAdmissao: { not: null } }],
      },
      select: { id: true, nome: true, dataNascimento: true, dataAdmissao: true, gestorId: true },
    });

    for (const colaborador of colaboradores) {
      // União do RH configurado + gestor direto (se houver), sem duplicar nem avisar o próprio aniversariante.
      const destinatarios = new Set(idsRH);
      if (colaborador.gestorId) destinatarios.add(colaborador.gestorId);
      destinatarios.delete(colaborador.id);

      if (colaborador.dataNascimento) {
        const dias = diasAteProximaOcorrencia(colaborador.dataNascimento, hoje);
        if (diasAntecedencia.includes(dias)) {
          await this.notificarDestinatarios(destinatarios, {
            tipo: 'ANIVERSARIO_PROXIMO',
            titulo: 'Aniversário próximo',
            mensagem: this.mensagem(colaborador.nome, dias, 'faz aniversário'),
          });
        }
      }
      if (colaborador.dataAdmissao) {
        const dias = diasAteProximaOcorrencia(colaborador.dataAdmissao, hoje);
        if (diasAntecedencia.includes(dias)) {
          await this.notificarDestinatarios(destinatarios, {
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
    destinatarios: Set<string>,
    dados: { tipo: string; titulo: string; mensagem: string },
  ) {
    await Promise.all(
      Array.from(destinatarios).map((userId) =>
        this.notificacoesService.criar({
          userId,
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
