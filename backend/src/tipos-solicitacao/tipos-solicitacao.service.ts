import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CampoFormularioDto } from '../common/dto/campo-formulario.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoSolicitacaoDto } from './dto/create-tipo-solicitacao.dto';
import { UpdateTipoSolicitacaoDto } from './dto/update-tipo-solicitacao.dto';

@Injectable()
export class TiposSolicitacaoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(all = false) {
    return this.prisma.tipoSolicitacao.findMany({
      where: all ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async create(dto: CreateTipoSolicitacaoDto) {
    this.validarLinkPublico(dto.permiteLinkPublico, dto.usaFormulario ?? false, dto.requerAprovacao ?? true);
    this.validarPreAdmissao(dto.ehPreAdmissao, dto.permiteLinkPublico ?? false, dto.camposFormulario);
    return this.prisma.tipoSolicitacao.create({
      data: {
        ...dto,
        camposFormulario: this.normalizarCampos(dto.camposFormulario),
        tokenLinkPublico: dto.permiteLinkPublico ? randomUUID() : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateTipoSolicitacaoDto) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de solicitação não encontrado');
    const permiteLinkPublico = dto.permiteLinkPublico ?? tipo.permiteLinkPublico;
    const usaFormulario = dto.usaFormulario ?? tipo.usaFormulario;
    const requerAprovacao = dto.requerAprovacao ?? tipo.requerAprovacao;
    this.validarLinkPublico(permiteLinkPublico, usaFormulario, requerAprovacao);
    const ehPreAdmissao = dto.ehPreAdmissao ?? tipo.ehPreAdmissao;
    const camposFormulario = (dto.camposFormulario ?? (tipo.camposFormulario as CampoFormularioDto[] | null)) ?? undefined;
    this.validarPreAdmissao(ehPreAdmissao, permiteLinkPublico, camposFormulario);
    return this.prisma.tipoSolicitacao.update({
      where: { id },
      data: {
        ...dto,
        camposFormulario: this.normalizarCampos(dto.camposFormulario),
        // Token fixo e reaproveitável: gera só na primeira vez que o link é habilitado.
        tokenLinkPublico: permiteLinkPublico && !tipo.tokenLinkPublico ? randomUUID() : undefined,
      },
    });
  }

  /** permiteLinkPublico só faz sentido com formulário configurado e passando por aprovação (quem responde não é identificado). */
  private validarLinkPublico(permiteLinkPublico: boolean | undefined, usaFormulario: boolean, requerAprovacao: boolean) {
    if (!permiteLinkPublico) return;
    if (!usaFormulario) throw new BadRequestException('O link público exige que o tipo colete dados via formulário');
    if (!requerAprovacao) throw new BadRequestException('O link público exige que o tipo passe por aprovação');
  }

  /** Pré-cadastro exige o link público e exatamente um campo mapeado pra NOME e outro pra EMAIL. */
  private validarPreAdmissao(
    ehPreAdmissao: boolean | undefined,
    permiteLinkPublico: boolean,
    camposFormulario?: CampoFormularioDto[],
  ) {
    if (!ehPreAdmissao) return;
    if (!permiteLinkPublico) throw new BadRequestException('Pré-cadastro exige que o link público esteja habilitado');
    const campos = camposFormulario ?? [];
    if (!campos.some((c) => c.mapeamento === 'NOME')) {
      throw new BadRequestException('Pré-cadastro exige um campo mapeado como "Nome"');
    }
    if (!campos.some((c) => c.mapeamento === 'EMAIL')) {
      throw new BadRequestException('Pré-cadastro exige um campo mapeado como "E-mail"');
    }
  }

  /**
   * Gera um id estável (uuid) pra cada campo novo — é a chave usada depois em
   * Solicitacao.respostasFormulario, então precisa sobreviver a edições de label/ordem.
   */
  private normalizarCampos(campos?: CampoFormularioDto[]) {
    if (!campos) return undefined;
    return campos.map((campo) => ({ ...campo, id: campo.id ?? randomUUID() }));
  }

  async remove(id: string) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de solicitação não encontrado');
    return this.prisma.tipoSolicitacao.update({ where: { id }, data: { ativo: false } });
  }

  async deletePermanently(id: string) {
    const tipo = await this.prisma.tipoSolicitacao.findUnique({
      where: { id },
      include: { _count: { select: { solicitacoes: true } } },
    });
    if (!tipo) throw new NotFoundException('Tipo de solicitação não encontrado');
    if (tipo._count.solicitacoes > 0) {
      throw new ConflictException('Não é possível excluir este tipo porque existem solicitações vinculadas a ele');
    }

    await this.prisma.tipoSolicitacao.delete({ where: { id } });
    return { success: true };
  }
}
