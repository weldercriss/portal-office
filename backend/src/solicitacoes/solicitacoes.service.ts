import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { ANEXO_DIR } from './anexo.storage';
import { CreateSolicitacaoDto } from './dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from './dto/update-solicitacao.dto';

const SOLICITACAO_INCLUDE = {
  user: { select: { id: true, nome: true, email: true } },
  responsavel: { select: { id: true, nome: true } },
  decididoPor: { select: { id: true, nome: true } },
  registradoPor: { select: { id: true, nome: true } },
  tipo: true,
} as const;

/** Formato de cada item de TipoSolicitacao.camposFormulario (Json) — ver common/dto/campo-formulario.dto.ts. */
interface CampoFormularioValor {
  id: string;
  label: string;
  tipo: string;
  obrigatorio?: boolean;
}

export interface FiltrosSolicitacao {
  userId?: string;
  tipoId?: string;
  status?: string;
  from?: string;
  to?: string;
  contaComoAfastamento?: string;
  ehFolga?: string;
}

interface Requisitante {
  id: string;
  role: string;
}

function formatarData(data: Date | null) {
  return data ? data.toISOString().slice(0, 10) : '(em aberto)';
}

function formatarDataBr(data: Date | null) {
  return data ? data.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '(em aberto)';
}

function parseBooleanQuery(valor?: string): boolean | undefined {
  if (valor === undefined) return undefined;
  return valor === 'true';
}

@Injectable()
export class SolicitacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  findAll(filtros: FiltrosSolicitacao) {
    const contaComoAfastamento = parseBooleanQuery(filtros.contaComoAfastamento);
    const ehFolga = parseBooleanQuery(filtros.ehFolga);
    return this.prisma.solicitacao.findMany({
      where: {
        userId: filtros.userId,
        tipoId: filtros.tipoId,
        status: filtros.status as never,
        dataInicio: filtros.from ? { gte: new Date(filtros.from) } : undefined,
        dataFim: filtros.to ? { lte: new Date(filtros.to) } : undefined,
        tipo:
          contaComoAfastamento !== undefined || ehFolga !== undefined
            ? { contaComoAfastamento, ehFolga }
            : undefined,
      },
      orderBy: { dataInicio: 'desc' },
      include: SOLICITACAO_INCLUDE,
    });
  }

  findMinhas(userId: string, filtros: Omit<FiltrosSolicitacao, 'userId'> = {}) {
    return this.findAll({ ...filtros, userId });
  }

  async findOne(id: string) {
    return this.obterOuFalhar(id);
  }

  async create(dto: CreateSolicitacaoDto, requisitante: Requisitante) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({ where: { id: dto.tipoId } });
    if (!tipo || !tipo.ativo) throw new NotFoundException('Tipo de solicitação não encontrado');
    this.validarPeriodo(dto.dataInicio, dto.dataFim);
    await this.validarResponsavel(dto.responsavelId);
    if (tipo.usaFormulario) {
      this.validarRespostasContraCampos(tipo.camposFormulario as CampoFormularioValor[] | null, dto.respostasFormulario ?? {}, {
        exigirObrigatorios: true,
      });
    }

    if (!tipo.requerAprovacao) {
      if (!ehAdminOuSuperior(requisitante.role)) {
        throw new ForbiddenException('Apenas administradores podem registrar este tipo de solicitação');
      }
      if (!dto.userId) throw new BadRequestException('Informe o colaborador');
      return this.prisma.solicitacao.create({
        data: {
          userId: dto.userId,
          responsavelId: dto.responsavelId,
          tipoId: tipo.id,
          dataInicio: new Date(dto.dataInicio),
          dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
          descricao: dto.descricao,
          respostasFormulario: dto.respostasFormulario,
          registradoPorId: requisitante.id,
          status: 'APROVADA',
          decididoPorId: requisitante.id,
          decididoEm: new Date(),
        },
        include: SOLICITACAO_INCLUDE,
      });
    }

    const userId = ehAdminOuSuperior(requisitante.role) ? (dto.userId ?? requisitante.id) : requisitante.id;
    const solicitacao = await this.prisma.solicitacao.create({
      data: {
        userId,
        responsavelId: dto.responsavelId,
        tipoId: tipo.id,
        dataInicio: new Date(dto.dataInicio),
        dataFim: dto.dataFim ? new Date(dto.dataFim) : undefined,
        descricao: dto.descricao,
        respostasFormulario: dto.respostasFormulario,
        registradoPorId: requisitante.id,
      },
      include: SOLICITACAO_INCLUDE,
    });

    if (!ehAdminOuSuperior(requisitante.role)) {
      await this.notificacoesService.criarParaAdmins({
        tipo: 'SOLICITACAO_CRIADA',
        titulo: `Nova solicitação de ${tipo.nome}`,
        mensagem: `${solicitacao.user?.nome} solicitou ${tipo.nome} de ${formatarData(solicitacao.dataInicio)} a ${formatarData(solicitacao.dataFim)}.`,
        telegramTexto: `📝 Nova solicitação!\n\n${solicitacao.user?.nome} solicitou ${tipo.nome}.\n\n📅 Período: ${formatarDataBr(solicitacao.dataInicio)} a ${formatarDataBr(solicitacao.dataFim)}\n\nAcesse o sistema para analisar.`,
        link: '/solicitacoes',
      });
    }

    return solicitacao;
  }

  async update(id: string, dto: UpdateSolicitacaoDto) {
    const atual = await this.obterOuFalhar(id);
    if (atual.tipo.requerAprovacao && atual.status !== 'SOLICITADA') {
      throw new BadRequestException('Só é possível editar uma solicitação ainda não decidida');
    }
    const dataInicio = dto.dataInicio ?? formatarData(atual.dataInicio);
    const dataFim = dto.dataFim ?? (atual.dataFim ? formatarData(atual.dataFim) : undefined);
    this.validarPeriodo(dataInicio, dataFim);
    if (dto.responsavelId !== atual.responsavelId) {
      await this.validarResponsavel(dto.responsavelId);
    }
    if (dto.respostasFormulario) {
      this.validarRespostasContraCampos(atual.tipo.camposFormulario as CampoFormularioValor[] | null, dto.respostasFormulario, {
        exigirObrigatorios: false,
      });
    }

    return this.prisma.solicitacao.update({
      where: { id },
      data: {
        userId: dto.userId,
        responsavelId: dto.responsavelId,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
        dataFim: dto.dataFim === undefined ? undefined : dto.dataFim ? new Date(dto.dataFim) : null,
        descricao: dto.descricao,
        // Merge, não substitui — um update parcial não pode apagar respostas/anexos de campo já gravados.
        respostasFormulario: dto.respostasFormulario
          ? ({ ...this.comoObjeto(atual.respostasFormulario), ...dto.respostasFormulario } as Prisma.InputJsonValue)
          : undefined,
      },
      include: SOLICITACAO_INCLUDE,
    });
  }

  async aprovar(id: string, aprovadorId: string) {
    const atual = await this.obterOuFalhar(id);
    if (!atual.tipo.requerAprovacao) {
      throw new BadRequestException('Este tipo de solicitação não passa por aprovação');
    }
    if (atual.status !== 'SOLICITADA') {
      throw new BadRequestException('Esta solicitação já foi decidida');
    }
    const solicitacao = await this.prisma.solicitacao.update({
      where: { id },
      data: { status: 'APROVADA', decididoPorId: aprovadorId, decididoEm: new Date() },
      include: SOLICITACAO_INCLUDE,
    });
    // Sem userId (resposta anônima via link público): não há ninguém pra notificar pessoalmente.
    if (solicitacao.userId) {
      await this.notificacoesService.criar({
        userId: solicitacao.userId,
        tipo: 'SOLICITACAO_APROVADA',
        titulo: `${solicitacao.tipo.nome} aprovada`,
        mensagem: `Sua solicitação de ${solicitacao.tipo.nome} de ${formatarData(solicitacao.dataInicio)} a ${formatarData(solicitacao.dataFim)} foi aprovada.`,
        telegramTexto: `✅ Solicitação aprovada!\n\nSua solicitação de ${solicitacao.tipo.nome} foi aprovada.\n\n📅 Período: ${formatarDataBr(solicitacao.dataInicio)} a ${formatarDataBr(solicitacao.dataFim)}\n\nConfira os detalhes no sistema.`,
        link: '/solicitacoes',
      });
    }
    return solicitacao;
  }

  async rejeitar(id: string, aprovadorId: string) {
    const atual = await this.obterOuFalhar(id);
    if (!atual.tipo.requerAprovacao) {
      throw new BadRequestException('Este tipo de solicitação não passa por aprovação');
    }
    if (atual.status !== 'SOLICITADA') {
      throw new BadRequestException('Esta solicitação já foi decidida');
    }
    const solicitacao = await this.prisma.solicitacao.update({
      where: { id },
      data: { status: 'REJEITADA', decididoPorId: aprovadorId, decididoEm: new Date() },
      include: SOLICITACAO_INCLUDE,
    });
    if (solicitacao.userId) {
      await this.notificacoesService.criar({
        userId: solicitacao.userId,
        tipo: 'SOLICITACAO_REJEITADA',
        titulo: `${solicitacao.tipo.nome} rejeitada`,
        mensagem: `Sua solicitação de ${solicitacao.tipo.nome} de ${formatarData(solicitacao.dataInicio)} a ${formatarData(solicitacao.dataFim)} foi rejeitada.`,
        telegramTexto: `❌ Solicitação rejeitada\n\nSua solicitação de ${solicitacao.tipo.nome} (${formatarDataBr(solicitacao.dataInicio)} a ${formatarDataBr(solicitacao.dataFim)}) não foi aprovada.\n\nFale com seu gestor para mais detalhes.`,
        link: '/solicitacoes',
      });
    }
    return solicitacao;
  }

  async cancelar(id: string, requisitante: Requisitante) {
    const atual = await this.obterOuFalhar(id);
    if (!ehAdminOuSuperior(requisitante.role) && atual.userId !== requisitante.id) {
      throw new ForbiddenException('Você só pode cancelar sua própria solicitação');
    }
    if (!atual.tipo.requerAprovacao) {
      throw new BadRequestException('Este tipo de solicitação não pode ser cancelado');
    }
    if (atual.status !== 'SOLICITADA') {
      throw new BadRequestException('Só é possível cancelar uma solicitação ainda não decidida');
    }
    return this.prisma.solicitacao.update({
      where: { id },
      data: { status: 'CANCELADA' },
      include: SOLICITACAO_INCLUDE,
    });
  }

  async remove(id: string) {
    const atual = await this.obterOuFalhar(id);
    if (atual.anexoCaminho) {
      await unlink(join(ANEXO_DIR, atual.anexoCaminho)).catch(() => undefined);
    }
    for (const valor of Object.values(this.comoObjeto(atual.respostasFormulario))) {
      const caminho = (valor as { caminho?: string } | null)?.caminho;
      if (caminho) await unlink(join(ANEXO_DIR, caminho)).catch(() => undefined);
    }
    await this.prisma.solicitacao.delete({ where: { id } });
    return { ok: true };
  }

  async anexar(id: string, file: Express.Multer.File, requisitante: Requisitante) {
    const atual = await this.obterOuFalhar(id);
    if (!ehAdminOuSuperior(requisitante.role) && atual.userId !== requisitante.id) {
      await unlink(file.path).catch(() => undefined);
      throw new ForbiddenException('Você só pode anexar arquivos à sua própria solicitação');
    }
    if (atual.anexoCaminho) {
      await unlink(join(ANEXO_DIR, atual.anexoCaminho)).catch(() => undefined);
    }
    return this.prisma.solicitacao.update({
      where: { id },
      data: { anexoNome: file.originalname, anexoCaminho: file.filename, anexoMimeType: file.mimetype },
      include: SOLICITACAO_INCLUDE,
    });
  }

  async obterAnexo(id: string, requisitante: Requisitante) {
    const atual = await this.obterOuFalhar(id);
    if (!ehAdminOuSuperior(requisitante.role) && atual.userId !== requisitante.id) {
      throw new ForbiddenException('Você só pode acessar o anexo da sua própria solicitação');
    }
    if (!atual.anexoCaminho) throw new NotFoundException('Esta solicitação não possui anexo');
    return {
      caminho: join(ANEXO_DIR, atual.anexoCaminho),
      nome: atual.anexoNome ?? 'anexo',
      mimeType: atual.anexoMimeType ?? 'application/octet-stream',
    };
  }

  async anexarCampoFormulario(id: string, campoId: string, file: Express.Multer.File, requisitante: Requisitante) {
    const atual = await this.obterOuFalhar(id);
    if (!ehAdminOuSuperior(requisitante.role) && atual.userId !== requisitante.id) {
      await unlink(file.path).catch(() => undefined);
      throw new ForbiddenException('Você só pode anexar arquivos à sua própria solicitação');
    }
    await this.gravarAnexoCampo(id, atual.tipo.camposFormulario, atual.respostasFormulario, campoId, file);
    return this.obterOuFalhar(id);
  }

  async obterAnexoCampoFormulario(id: string, campoId: string, requisitante: Requisitante) {
    const atual = await this.obterOuFalhar(id);
    if (!ehAdminOuSuperior(requisitante.role) && atual.userId !== requisitante.id) {
      throw new ForbiddenException('Você só pode acessar o anexo da sua própria solicitação');
    }
    return this.obterAnexoCampoDe(atual.respostasFormulario, campoId);
  }

  /**
   * Formulário público (link fixo do TIPO, como um Google Forms): qualquer pessoa com o
   * link vê as perguntas, sem login e sem precisar ser um colaborador cadastrado.
   */
  async obterFormularioPublico(tipoToken: string) {
    const tipo = await this.obterTipoPublicoValido(tipoToken);
    return { tipoNome: tipo.nome, camposFormulario: tipo.camposFormulario };
  }

  /** Cada envio pelo link público cria uma Solicitacao nova, sem colaborador vinculado (userId nulo). */
  async criarSolicitacaoPublica(tipoToken: string, respostas: Record<string, unknown>) {
    const tipo = await this.obterTipoPublicoValido(tipoToken);
    this.validarRespostasContraCampos(tipo.camposFormulario as CampoFormularioValor[] | null, respostas, {
      exigirObrigatorios: true,
    });
    const solicitacao = await this.prisma.solicitacao.create({
      data: {
        tipoId: tipo.id,
        dataInicio: new Date(),
        respostasFormulario: respostas as Prisma.InputJsonValue,
        status: 'SOLICITADA',
      },
    });
    await this.notificacoesService.criarParaAdmins({
      tipo: 'SOLICITACAO_CRIADA',
      titulo: `Nova resposta em ${tipo.nome}`,
      mensagem: `Uma resposta anônima foi enviada pelo link público de ${tipo.nome}.`,
      telegramTexto: `📝 Nova resposta!\n\nAlguém respondeu ao formulário público de ${tipo.nome}.\n\nAcesse o sistema para analisar.`,
      link: '/solicitacoes',
    });
    return { id: solicitacao.id };
  }

  /** Upload de arquivo pra uma resposta anônima recém-criada, ainda dentro do mesmo tipo e não decidida. */
  async anexarCampoFormularioPublico(tipoToken: string, solicitacaoId: string, campoId: string, file: Express.Multer.File) {
    const tipo = await this.obterTipoPublicoValido(tipoToken).catch(async (erro) => {
      await unlink(file.path).catch(() => undefined);
      throw erro;
    });
    const solicitacao = await this.prisma.solicitacao.findUnique({ where: { id: solicitacaoId } });
    if (!solicitacao || solicitacao.tipoId !== tipo.id || solicitacao.userId || solicitacao.status !== 'SOLICITADA') {
      await unlink(file.path).catch(() => undefined);
      throw new NotFoundException('Resposta não encontrada');
    }
    await this.gravarAnexoCampo(solicitacaoId, tipo.camposFormulario, solicitacao.respostasFormulario, campoId, file);
    return { ok: true };
  }

  async existeAfastamentoNoPeriodo(userId: string, data: Date) {
    return this.prisma.solicitacao.findFirst({
      where: {
        userId,
        status: 'APROVADA',
        tipo: { contaComoAfastamento: true },
        dataInicio: { lte: data },
        OR: [{ dataFim: null }, { dataFim: { gte: data } }],
      },
      include: SOLICITACAO_INCLUDE,
    });
  }

  /** Token inexistente ou tipo sem o link habilitado respondem com o mesmo erro genérico. */
  private async obterTipoPublicoValido(tipoToken: string) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({ where: { tokenLinkPublico: tipoToken } });
    if (!tipo || !tipo.ativo || !tipo.permiteLinkPublico) {
      throw new NotFoundException('Link inválido');
    }
    return tipo;
  }

  private async gravarAnexoCampo(
    id: string,
    camposFormulario: unknown,
    respostasAtuais: unknown,
    campoId: string,
    file: Express.Multer.File,
  ) {
    const campos = (camposFormulario as CampoFormularioValor[] | null) ?? [];
    const campo = campos.find((c) => c.id === campoId);
    if (!campo || campo.tipo !== 'ARQUIVO') {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Campo de anexo inválido para este formulário');
    }
    const respostas = this.comoObjeto(respostasAtuais);
    const anterior = respostas[campoId] as { caminho?: string } | undefined;
    if (anterior?.caminho) {
      await unlink(join(ANEXO_DIR, anterior.caminho)).catch(() => undefined);
    }
    await this.prisma.solicitacao.update({
      where: { id },
      data: {
        respostasFormulario: {
          ...respostas,
          [campoId]: { nome: file.originalname, caminho: file.filename, mimeType: file.mimetype },
        } as Prisma.InputJsonValue,
      },
    });
  }

  private obterAnexoCampoDe(respostasFormulario: unknown, campoId: string) {
    const respostas = this.comoObjeto(respostasFormulario);
    const valor = respostas[campoId] as { nome?: string; caminho?: string; mimeType?: string } | undefined;
    if (!valor?.caminho) throw new NotFoundException('Este campo não possui anexo');
    return {
      caminho: join(ANEXO_DIR, valor.caminho),
      nome: valor.nome ?? 'anexo',
      mimeType: valor.mimeType ?? 'application/octet-stream',
    };
  }

  private comoObjeto(valor: unknown): Record<string, unknown> {
    return (valor as Record<string, unknown>) ?? {};
  }

  private validarRespostasContraCampos(
    campos: CampoFormularioValor[] | null,
    respostas: Record<string, unknown>,
    { exigirObrigatorios }: { exigirObrigatorios: boolean },
  ) {
    const camposDef = campos ?? [];
    const idsValidos = new Set(camposDef.map((campo) => campo.id));
    for (const chave of Object.keys(respostas)) {
      if (!idsValidos.has(chave)) throw new BadRequestException('Resposta de formulário com campo desconhecido');
    }
    if (!exigirObrigatorios) return;
    for (const campo of camposDef) {
      if (!campo.obrigatorio || campo.tipo === 'ARQUIVO') continue;
      const valor = respostas[campo.id];
      const preenchido = Array.isArray(valor) ? valor.length > 0 : valor !== undefined && valor !== null && valor !== '';
      if (!preenchido) throw new BadRequestException(`Preencha o campo obrigatório "${campo.label}"`);
    }
  }

  private validarPeriodo(dataInicio: string, dataFim?: string) {
    if (dataFim && new Date(dataFim) < new Date(dataInicio)) {
      throw new BadRequestException('A data final não pode ser anterior à data inicial');
    }
  }

  private async validarResponsavel(responsavelId?: string | null) {
    if (responsavelId === undefined || responsavelId === null) return;
    const responsavel = await this.prisma.user.findUnique({
      where: { id: responsavelId },
      select: { ativo: true },
    });
    if (!responsavel?.ativo) {
      throw new BadRequestException('Selecione um responsável ativo');
    }
  }

  private async obterOuFalhar(id: string) {
    const solicitacao = await this.prisma.solicitacao.findUnique({ where: { id }, include: SOLICITACAO_INCLUDE });
    if (!solicitacao) throw new NotFoundException('Solicitação não encontrada');
    return solicitacao;
  }
}
