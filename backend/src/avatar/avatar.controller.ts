import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AvatarService } from './avatar.service';
import { AVATAR_MULTER_OPTIONS } from './avatar.storage';

/**
 * Foto de perfil: upload manual do RH, além da que já vem automaticamente do
 * login Google. O GET é deliberadamente público (sem guard) — a UI usa
 * `<img src>` direto em várias telas (cabeçalho, listas, Central de
 * Documentos), e uma tag <img> não consegue mandar o header Authorization
 * que a API normalmente exige. Mesma exposição que a foto do Google já tem
 * hoje (também é uma URL pública).
 */
@Controller('colaboradores/:userId/avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('arquivo', AVATAR_MULTER_OPTIONS))
  upload(@Param('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie uma foto');
    return this.avatarService.upload(userId, file);
  }

  @Get()
  async baixar(@Param('userId') userId: string, @Res() res: Response) {
    const arquivo = await this.avatarService.obterArquivo(userId);
    res.setHeader('Content-Type', arquivo.mimeType);
    res.sendFile(arquivo.caminho);
  }
}
