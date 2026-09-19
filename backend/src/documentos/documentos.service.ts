import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { garantirAcessoColaborador } from '../common/acesso-colaborador.util';
import { PrismaService } from '../prisma/prisma.service';
import { uploadDir } from '../common/upload.storage';
import { CreateDocumentoDto } from './dto/create-documento.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@Injectable()
export class DocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  private async gestorIdDoAlvo(alvoId: string, chamador: UsuarioAutenticado): Promise<string | null> {
    if (chamador.role !== 'GESTOR' || chamador.id === alvoId) return null;
    const alvo = await this.prisma.user.findUnique({ where: { id: alvoId }, select: { gestorId: true } });
    return alvo?.gestorId ?? null;
  }

  async findAll(userId: string, chamador: UsuarioAutenticado) {
    garantirAcessoColaborador(chamador, userId, await this.gestorIdDoAlvo(userId, chamador));
    return this.prisma.documentoColaborador.findMany({
      where: { userId },
      orderBy: { criadoEm: 'desc' },
      include: { categoria: { select: { id: true, nome: true } } },
    });
  }

  create(userId: string, dto: CreateDocumentoDto, file: Express.Multer.File, criadoPor: UsuarioAutenticado) {
    return this.prisma.documentoColaborador.create({
      data: {
        userId,
        categoriaId: dto.categoriaId,
        nome: dto.nome,
        arquivoNome: file.originalname,
        arquivoCaminho: file.filename,
        arquivoMimeType: file.mimetype,
        validade: dto.validade ? new Date(dto.validade) : undefined,
        competencia: dto.competencia ? new Date(dto.competencia) : undefined,
        criadoPorId: criadoPor.id,
      },
      include: { categoria: { select: { id: true, nome: true } } },
    });
  }

  /** Árvore da Central de Documentos: um colaborador por linha, com a contagem de documentos. */
  findResumo() {
    return this.prisma.user.findMany({
      // Pré-cadastro (PENDENTE) não é headcount navegável ainda.
      where: { ativo: true, statusColaborador: { not: 'PENDENTE' } },
      select: {
        id: true,
        nome: true,
        avatarUrl: true,
        group: { select: { id: true, nome: true } },
        _count: { select: { documentos: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async remove(id: string) {
    const existente = await this.prisma.documentoColaborador.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Documento não encontrado');
    await this.prisma.documentoColaborador.delete({ where: { id } });
    return { success: true };
  }

  async obterArquivo(id: string, usuario: UsuarioAutenticado) {
    const documento = await this.prisma.documentoColaborador.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException('Documento não encontrado');
    garantirAcessoColaborador(usuario, documento.userId, await this.gestorIdDoAlvo(documento.userId, usuario));
    return {
      nome: documento.arquivoNome,
      mimeType: documento.arquivoMimeType,
      caminho: join(uploadDir('documentos'), documento.arquivoCaminho),
    };
  }
}
