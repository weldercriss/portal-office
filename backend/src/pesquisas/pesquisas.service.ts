import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CampoFormularioValor, validarRespostasContraCampos } from '../common/campo-formulario.util';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePesquisaDto } from './dto/create-pesquisa.dto';
import { ResponderPesquisaDto } from './dto/responder-pesquisa.dto';

const PESQUISA_INCLUDE = { criadoPor: { select: { id: true, nome: true } } } as const;

const TITULO_TIPO: Record<string, string> = {
  NPS: 'pesquisa de NPS',
  NR1: 'pesquisa de NR-1',
  FEEDBACK_1_1: 'feedback 1:1',
  GERAL: 'pesquisa',
};

export interface AgregadoCampo {
  campoId: string;
  label: string;
  tipo: string;
  contagemOpcoes?: { opcao: string; total: number }[];
  media?: number | null;
  valores?: (string | number)[];
}

@Injectable()
export class PesquisasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  listar() {
    return this.prisma.pesquisa.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { ...PESQUISA_INCLUDE, _count: { select: { convites: true, respostas: true } } },
    });
  }

  /** Pesquisas ativas com convite do próprio usuário ainda sem resposta. */
  async pendentes(userId: string) {
    const convites = await this.prisma.pesquisaConvite.findMany({
      where: { userId, respondeuEm: null, pesquisa: { ativa: true } },
      include: { pesquisa: true },
      orderBy: { convidadoEm: 'desc' },
    });
    return convites.map((convite) => convite.pesquisa);
  }

  async resultado(id: string) {
    const pesquisa = await this.obterOuFalhar(id);
    const [totalConvites, totalRespondidas, respostas] = await Promise.all([
      this.prisma.pesquisaConvite.count({ where: { pesquisaId: id } }),
      this.prisma.pesquisaConvite.count({ where: { pesquisaId: id, respondeuEm: { not: null } } }),
      this.prisma.pesquisaResposta.findMany({ where: { pesquisaId: id }, select: { respostas: true } }),
    ]);
    const campos = (pesquisa.campos as CampoFormularioValor[] | null) ?? [];
    const agregados: AgregadoCampo[] = campos.map((campo) =>
      this.agregarCampo(
        campo,
        respostas.map((resposta) => (resposta.respostas as Record<string, unknown> | null)?.[campo.id]),
      ),
    );
    return {
      pesquisa,
      totalConvites,
      totalRespondidas,
      percentualRespondido: totalConvites === 0 ? 0 : Math.round((totalRespondidas / totalConvites) * 100),
      agregados,
    };
  }

  /**
   * Cria a Pesquisa e os convites em massa (lista de userId, ou os liderados diretos de um gestor,
   * expandidos aqui — snapshot no momento da criação). Sem tipo ARQUIVO: pesquisa anônima não tem
   * upload de arquivo.
   */
  async create(dto: CreatePesquisaDto, criadoPorId: string) {
    if (dto.campos.some((campo) => campo.tipo === 'ARQUIVO')) {
      throw new BadRequestException('Pesquisas não aceitam campos de anexo de arquivo');
    }

    const destinatarioIds = await this.resolverDestinatarios(dto.destinatarios);
    if (destinatarioIds.length === 0) {
      throw new BadRequestException('Selecione ao menos um destinatário');
    }

    // Mesmo padrão de TiposSolicitacaoService.normalizarCampos: garante um id estável por
    // campo no servidor, sem depender de o cliente sempre mandar um (respostas são keyed por id).
    const campos = dto.campos.map((campo) => ({ ...campo, id: campo.id ?? randomUUID() }));

    const pesquisa = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.pesquisa.create({
        data: {
          titulo: dto.titulo.trim(),
          descricao: dto.descricao?.trim() || null,
          tipo: dto.tipo,
          campos: campos as unknown as Prisma.InputJsonValue,
          criadoPorId,
        },
      });
      await tx.pesquisaConvite.createMany({
        data: destinatarioIds.map((userId) => ({ pesquisaId: criada.id, userId })),
      });
      return criada;
    });

    const rotulo = TITULO_TIPO[dto.tipo] ?? 'pesquisa';
    await Promise.all(
      destinatarioIds.map((userId) =>
        this.notificacoesService.criar({
          userId,
          tipo: 'PESQUISA_DISPONIVEL',
          titulo: `Nova ${rotulo}: ${pesquisa.titulo}`,
          mensagem: `Você foi convidado a responder "${pesquisa.titulo}". A resposta é anônima.`,
          telegramTexto: `📋 Nova ${rotulo}!\n\n"${pesquisa.titulo}" está disponível para você responder — a resposta é anônima.\n\nAcesse o sistema para participar.`,
          link: '/pesquisas',
        }),
      ),
    );

    return this.obterOuFalhar(pesquisa.id);
  }

  async encerrar(id: string) {
    await this.obterOuFalhar(id);
    return this.prisma.pesquisa.update({ where: { id }, data: { ativa: false }, include: PESQUISA_INCLUDE });
  }

  /** Exclusão definitiva (convites e respostas somem junto, por cascade) — reservada ao MASTER. */
  async remover(id: string) {
    await this.obterOuFalhar(id);
    await this.prisma.pesquisa.delete({ where: { id } });
    return { success: true };
  }

  /** Resposta anônima: grava o conteúdo sem userId e marca o convite como respondido, na mesma transação. */
  async responder(id: string, userId: string, dto: ResponderPesquisaDto) {
    const pesquisa = await this.obterOuFalhar(id);
    if (!pesquisa.ativa) throw new BadRequestException('Esta pesquisa foi encerrada');

    const convite = await this.prisma.pesquisaConvite.findUnique({
      where: { pesquisaId_userId: { pesquisaId: id, userId } },
    });
    if (!convite) throw new ForbiddenException('Você não foi convidado para esta pesquisa');
    if (convite.respondeuEm) throw new BadRequestException('Você já respondeu esta pesquisa');

    validarRespostasContraCampos(pesquisa.campos as CampoFormularioValor[] | null, dto.respostas, {
      exigirObrigatorios: true,
    });

    await this.prisma.$transaction([
      this.prisma.pesquisaResposta.create({
        data: { pesquisaId: id, respostas: dto.respostas as Prisma.InputJsonValue },
      }),
      this.prisma.pesquisaConvite.update({
        where: { pesquisaId_userId: { pesquisaId: id, userId } },
        data: { respondeuEm: new Date() },
      }),
    ]);
    return { ok: true };
  }

  private async resolverDestinatarios(destinatarios: CreatePesquisaDto['destinatarios']): Promise<string[]> {
    if (destinatarios.gestorId) {
      const subordinados = await this.prisma.user.findMany({
        where: { gestorId: destinatarios.gestorId, ativo: true, statusColaborador: { not: 'PENDENTE' } },
        select: { id: true },
      });
      return subordinados.map((subordinado) => subordinado.id);
    }
    const userIds = [...new Set(destinatarios.userIds ?? [])];
    if (userIds.length === 0) return [];
    const validos = await this.prisma.user.findMany({
      where: { id: { in: userIds }, ativo: true, statusColaborador: { not: 'PENDENTE' } },
      select: { id: true },
    });
    return validos.map((valido) => valido.id);
  }

  private agregarCampo(campo: CampoFormularioValor, valoresBrutos: unknown[]): AgregadoCampo {
    const valores = valoresBrutos.filter((valor) => valor !== undefined && valor !== null && valor !== '');
    if (campo.tipo === 'SELECAO') {
      const contagem = new Map<string, number>();
      for (const opcao of campo.opcoes ?? []) contagem.set(opcao, 0);
      for (const valor of valores) contagem.set(String(valor), (contagem.get(String(valor)) ?? 0) + 1);
      return {
        campoId: campo.id,
        label: campo.label,
        tipo: campo.tipo,
        contagemOpcoes: [...contagem].map(([opcao, total]) => ({ opcao, total })),
      };
    }
    if (campo.tipo === 'NUMERO') {
      const numeros = valores.map(Number).filter((numero) => !Number.isNaN(numero));
      const media = numeros.length > 0 ? numeros.reduce((soma, numero) => soma + numero, 0) / numeros.length : null;
      return { campoId: campo.id, label: campo.label, tipo: campo.tipo, media, valores: numeros };
    }
    return { campoId: campo.id, label: campo.label, tipo: campo.tipo, valores: valores.map(String) };
  }

  private async obterOuFalhar(id: string) {
    const pesquisa = await this.prisma.pesquisa.findUnique({ where: { id }, include: PESQUISA_INCLUDE });
    if (!pesquisa) throw new NotFoundException('Pesquisa não encontrada');
    return pesquisa;
  }
}
