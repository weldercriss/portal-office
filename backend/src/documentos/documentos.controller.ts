import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { createUploadMulterOptions } from '../common/upload.storage';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { DocumentosService } from './documentos.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

function garantirAcesso(req: Request, userId: string) {
  const usuario = req.user as UsuarioAutenticado;
  if (!ehAdminOuSuperior(usuario.role) && usuario.id !== userId) {
    throw new ForbiddenException('Você não tem acesso aos documentos deste colaborador');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('colaboradores/:userId/documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Req() req: Request) {
    garantirAcesso(req, userId);
    return this.documentosService.findAll(userId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('arquivo', createUploadMulterOptions('documentos')))
  create(
    @Param('userId') userId: string,
    @Body() dto: CreateDocumentoDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo');
    return this.documentosService.create(userId, dto, file, req.user as UsuarioAutenticado);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.documentosService.remove(id);
  }

  @Get(':id/arquivo')
  async baixar(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const arquivo = await this.documentosService.obterArquivo(id, req.user as UsuarioAutenticado);
    res.setHeader('Content-Type', arquivo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
    res.sendFile(arquivo.caminho);
  }
}
