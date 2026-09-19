import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AVATAR_DIR } from './avatar.storage';

@Injectable()
export class AvatarService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: string, file: Express.Multer.File) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarCaminho: true },
    });
    if (!usuario) throw new NotFoundException('Colaborador não encontrado');

    await this.apagarArquivoAnterior(usuario.avatarCaminho);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarCaminho: file.filename,
        avatarMimeType: file.mimetype,
        avatarUrl: `/colaboradores/${userId}/avatar`,
      },
      select: { id: true, avatarUrl: true },
    });
  }

  async obterArquivo(userId: string) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarCaminho: true, avatarMimeType: true },
    });
    if (!usuario?.avatarCaminho || !usuario.avatarMimeType) {
      throw new NotFoundException('Este colaborador não tem foto cadastrada');
    }
    return { mimeType: usuario.avatarMimeType, caminho: join(AVATAR_DIR, usuario.avatarCaminho) };
  }

  /** O arquivo pode já não estar lá (disco limpo, restore): apagar é best-effort. */
  private async apagarArquivoAnterior(caminho: string | null) {
    if (!caminho) return;
    await unlink(join(AVATAR_DIR, caminho)).catch(() => undefined);
  }
}
