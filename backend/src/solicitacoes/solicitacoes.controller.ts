import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { RequireRotina } from '../auth/rotina.decorator';
import { RotinaGuard } from '../auth/rotina.guard';
import { ANEXO_MULTER_OPTIONS } from './anexo.storage';
import { CreateSolicitacaoDto } from './dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from './dto/update-solicitacao.dto';
import { SolicitacoesService } from './solicitacoes.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('solicitacoes')
@Controller('solicitacoes')
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('userId') userId?: string,
    @Query('tipoId') tipoId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('contaComoAfastamento') contaComoAfastamento?: string,
    @Query('ehFolga') ehFolga?: string,
  ) {
    return this.solicitacoesService.findAll({ userId, tipoId, status, from, to, contaComoAfastamento, ehFolga });
  }

  @Get('minhas')
  findMinhas(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('contaComoAfastamento') contaComoAfastamento?: string,
    @Query('ehFolga') ehFolga?: string,
  ) {
    return this.solicitacoesService.findMinhas((req.user as UsuarioAutenticado).id, {
      status,
      from,
      to,
      contaComoAfastamento,
      ehFolga,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.solicitacoesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSolicitacaoDto, @Req() req: Request) {
    return this.solicitacoesService.create(dto, req.user as UsuarioAutenticado);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateSolicitacaoDto) {
    return this.solicitacoesService.update(id, dto);
  }

  @Patch(':id/aprovar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  aprovar(@Param('id') id: string, @Req() req: Request) {
    return this.solicitacoesService.aprovar(id, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id/rejeitar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  rejeitar(@Param('id') id: string, @Req() req: Request) {
    return this.solicitacoesService.rejeitar(id, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string, @Req() req: Request) {
    return this.solicitacoesService.cancelar(id, req.user as UsuarioAutenticado);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.solicitacoesService.remove(id);
  }

  @Post(':id/anexo')
  @UseInterceptors(FileInterceptor('anexo', ANEXO_MULTER_OPTIONS))
  anexar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Envie um arquivo');
    return this.solicitacoesService.anexar(id, file, req.user as UsuarioAutenticado);
  }

  @Get(':id/anexo')
  async baixarAnexo(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const anexo = await this.solicitacoesService.obterAnexo(id, req.user as UsuarioAutenticado);
    res.setHeader('Content-Type', anexo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(anexo.nome)}"`);
    res.sendFile(anexo.caminho);
  }
}
