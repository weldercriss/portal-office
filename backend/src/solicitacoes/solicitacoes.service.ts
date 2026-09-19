import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoChecklist } from '@prisma/client';
import { randomUUID } from 'crypto';
import { copyFile, unlink } from 'fs/promises';
import { extname, join } from 'path';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { CampoFormularioValor, validarRespostasContraCampos } from '../common/campo-formulario.util';
import { uploadDir } from '../common/upload.storage';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { OnboardingService } from '../onboarding/onboarding.service';
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

/** Categoria onde os anexos ARQUIVO do pré-cadastro caem — criada sob demanda se ainda não existir. */
const CATEGORIA_PRE_ADMISSAO = 'Documentação de admissão';

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
    private readonly onboardingService: OnboardingService,
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
      validarRespostasContraCampos(tipo.camposFormulario as CampoFormularioValor[] | null, dto.respostasFormulario ?? {}, {
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
      validarRespostasContraCampos(atual.tipo.camposFormulario as CampoFormularioValor[] | null, dto.respostasFormulario, {
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

  /**
   * Cada envio pelo link público cria uma Solicitacao nova. Pra um tipo comum fica sem
   * colaborador vinculado (userId nulo); pra um tipo ehPreAdmissao, cria o User em
   * status PENDENTE e já vincula a Solicitacao a ele (ver criarSolicitacaoPreAdmissao).
   */
  async criarSolicitacaoPublica(tipoToken: string, respostas: Record<string, unknown>) {
    const tipo = await this.obterTipoPublicoValido(tipoToken);
    validarRespostasContraCampos(tipo.camposFormulario as CampoFormularioValor[] | null, respostas, {
      exigirObrigatorios: true,
    });

    if (tipo.ehPreAdmissao) {
      return this.criarSolicitacaoPreAdmissao(tipo, respostas);
    }

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

  /** Upload de arquivo pra uma resposta recém-criada pelo link público, ainda dentro do mesmo tipo e não decidida. */
  async anexarCampoFormularioPublico(tipoToken: string, solicitacaoId: string, campoId: string, file: Express.Multer.File) {
    const tipo = await this.obterTipoPublicoValido(tipoToken).catch(async (erro) => {
      await unlink(file.path).catch(() => undefined);
      throw erro;
    });
    const solicitacao = await this.prisma.solicitacao.findUnique({ where: { id: solicitacaoId } });
    // registradoPorId (não userId) é o que distingue "veio do link público": uma pré-admissão já tem
    // userId preenchido pelo User recém-criado, mas nunca um registradoPorId (ninguém autenticado a criou).
    if (!solicitacao || solicitacao.tipoId !== tipo.id || solicitacao.registradoPorId || solicitacao.status !== 'SOLICITADA') {
      await unlink(file.path).catch(() => undefined);
      throw new NotFoundException('Resposta não encontrada');
    }
    await this.gravarAnexoCampo(solicitacaoId, tipo.camposFormulario, solicitacao.respostasFormulario, campoId, file);
    if (tipo.ehPreAdmissao && solicitacao.userId) {
      await this.copiarAnexoParaDocumento(solicitacao.userId, file);
    }
    return { ok: true };
  }

  /**
   * Extrai nome/e-mail dos campos mapeados, cria o User (statusColaborador=PENDENTE,
   * sem acesso à plataforma) e a Solicitacao já vinculada a ele numa transação, gera o
   * checklist de admissão padrão e avisa o RH pra revisar.
   */
  private async criarSolicitacaoPreAdmissao(
    tipo: { id: string; nome: string; camposFormulario: unknown },
    respostas: Record<string, unknown>,
  ) {
    const { nome, email } = this.extrairIdentidade(tipo.camposFormulario as CampoFormularioValor[], respostas);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Informe um e-mail válido');
    }
    const existente = await this.prisma.user.findUnique({ where: { email } });
    // Mensagem genérica de propósito: não confirma pra quem responde que aquele e-mail já tem cadastro.
    if (existente) throw new BadRequestException('Não foi possível concluir o pré-cadastro com os dados informados');

    const { user, solicitacao } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { nome, email, senhaHash: '', acessoPlataforma: false, statusColaborador: 'PENDENTE', role: 'USER' },
      });
      const solicitacao = await tx.solicitacao.create({
        data: {
          userId: user.id,
          tipoId: tipo.id,
          dataInicio: new Date(),
          respostasFormulario: respostas as Prisma.InputJsonValue,
          status: 'SOLICITADA',
        },
      });
      return { user, solicitacao };
    });

    await this.onboardingService.gerarPadrao(user.id, TipoChecklist.ADMISSAO);
    await this.notificacoesService.criarParaAdmins({
      tipo: 'PRE_CADASTRO_CRIADO',
      titulo: `Novo pré-cadastro: ${nome}`,
      mensagem: `${nome} enviou o pré-cadastro de ${tipo.nome}. Revise os dados e autorize em Colaboradores.`,
      telegramTexto: `🆕 Novo pré-cadastro!\n\n${nome} enviou o formulário de ${tipo.nome}.\n\nRevise e autorize em Configurações → Colaboradores.`,
      link: '/configuracoes/colaboradores',
    });
    return { id: solicitacao.id };
  }

  private extrairIdentidade(campos: CampoFormularioValor[] | null, respostas: Record<string, unknown>) {
    const campoNome = (campos ?? []).find((c) => c.mapeamento === 'NOME');
    const campoEmail = (campos ?? []).find((c) => c.mapeamento === 'EMAIL');
    const nome = campoNome ? String(respostas[campoNome.id] ?? '').trim() : '';
    const email = campoEmail ? String(respostas[campoEmail.id] ?? '').trim().toLowerCase() : '';
    if (!nome || !email) throw new BadRequestException('Preencha nome e e-mail para concluir o pré-cadastro');
    return { nome, email };
  }

  /** Copia o anexo já salvo em uploads/solicitacoes para uploads/documentos, como DocumentoColaborador do próprio pré-cadastrado. */
  private async copiarAnexoParaDocumento(userId: string, file: Express.Multer.File) {
    const categoria = await this.prisma.categoriaDocumento.upsert({
      where: { nome: CATEGORIA_PRE_ADMISSAO },
      create: { nome: CATEGORIA_PRE_ADMISSAO },
      update: {},
    });
    const novoNome = `${randomUUID()}${extname(file.filename)}`;
    await copyFile(join(ANEXO_DIR, file.filename), join(uploadDir('documentos'), novoNome));
    await this.prisma.documentoColaborador.create({
      data: {
        userId,
        categoriaId: categoria.id,
        nome: file.originalname,
        arquivoNome: file.originalname,
        arquivoCaminho: novoNome,
        arquivoMimeType: file.mimetype,
        criadoPorId: userId,
      },
    });
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
