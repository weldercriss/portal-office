import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { ehAdminOuSuperior } from '../auth/roles.util';
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

  findAll(userId: string) {
    return this.prisma.documentoColaborador.findMany({ where: { userId }, orderBy: { criadoEm: 'desc' } });
  }

  create(userId: string, dto: CreateDocumentoDto, file: Express.Multer.File, criadoPor: UsuarioAutenticado) {
    return this.prisma.documentoColaborador.create({
      data: {
        userId,
        tipo: dto.tipo,
        nome: dto.nome,
        arquivoNome: file.originalname,
        arquivoCaminho: file.filename,
        arquivoMimeType: file.mimetype,
        validade: dto.validade ? new Date(dto.validade) : undefined,
        criadoPorId: criadoPor.id,
      },
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
    if (!ehAdminOuSuperior(usuario.role) && usuario.id !== documento.userId) {
      throw new ForbiddenException('Você não tem acesso a este documento');
    }
    return {
      nome: documento.arquivoNome,
      mimeType: documento.arquivoMimeType,
      caminho: join(uploadDir('documentos'), documento.arquivoCaminho),
    };
  }
}
