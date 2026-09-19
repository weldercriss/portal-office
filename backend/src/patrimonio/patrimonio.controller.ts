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
import { AlocacoesService } from './alocacoes.service';
import { CreateAlocacaoDto, DevolverAlocacaoDto, UpdateAlocacaoDto } from './dto/alocacao.dto';
import { CreateEquipamentoDto, UpdateEquipamentoDto } from './dto/equipamento.dto';
import { CreateTipoEquipamentoDto, UpdateTipoEquipamentoDto } from './dto/tipo-equipamento.dto';
import { EquipamentosService } from './equipamentos.service';
import { TERMO_MULTER_OPTIONS } from './termo.storage';
import { TiposEquipamentoService } from './tipos-equipamento.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

function usuario(req: Request): UsuarioAutenticado {
  return req.user as UsuarioAutenticado;
}

/** Catálogo do que é fornecido: Notebook, Headset, Mouse, Fone... */
@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('patrimonio')
@Controller('patrimonio/tipos')
export class TiposEquipamentoController {
  constructor(private readonly tiposService: TiposEquipamentoService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.tiposService.findAll(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiposService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTipoEquipamentoDto) {
    return this.tiposService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTipoEquipamentoDto) {
    return this.tiposService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.tiposService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string) {
    return this.tiposService.deletePermanently(id);
  }
}

/** Inventário: cada item físico, com patrimônio, série, marca e estado. */
@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('patrimonio')
@Controller('patrimonio/equipamentos')
export class EquipamentosController {
  constructor(private readonly equipamentosService: EquipamentosService) {}

  @Get()
  findAll(
    @Req() req: Request,
    @Query('tipoId') tipoId?: string,
    @Query('status') status?: string,
    @Query('estado') estado?: string,
    @Query('colaboradorId') colaboradorId?: string,
    @Query('busca') busca?: string,
    @Query('disponiveis') disponiveis?: string,
    @Query('all') all?: string,
  ) {
    return this.equipamentosService.findAll(
      {
        tipoId,
        status,
        estado,
        colaboradorId,
        busca,
        disponiveis: disponiveis === 'true',
        all: all === 'true',
      },
      usuario(req),
    );
  }

  /** Contadores por situação, para o cabeçalho do inventário. */
  @Get('resumo')
  resumo() {
    return this.equipamentosService.resumo();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.equipamentosService.findOne(id, usuario(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateEquipamentoDto) {
    return this.equipamentosService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateEquipamentoDto) {
    return this.equipamentosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.equipamentosService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string) {
    return this.equipamentosService.deletePermanently(id);
  }
}

/**
 * Registros de entrega: quem está com o quê, desde quando, e o termo assinado.
 * Consultar é de quem tem a rotina; registrar e devolver é do admin, que é
 * quem controla o estoque.
 */
@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('patrimonio')
@Controller('patrimonio/alocacoes')
export class AlocacoesController {
  constructor(private readonly alocacoesService: AlocacoesService) {}

  @Get()
  findAll(
    @Req() req: Request,
    @Query('colaboradorId') colaboradorId?: string,
    @Query('equipamentoId') equipamentoId?: string,
    @Query('status') status?: string,
    @Query('ativas') ativas?: string,
  ) {
    return this.alocacoesService.findAll(
      {
        colaboradorId,
        equipamentoId,
        status,
        ativas: ativas === 'true',
      },
      usuario(req),
    );
  }

  /** O que está comigo hoje — visível a qualquer um com a rotina. */
  @Get('meus')
  findMeus(@Req() req: Request, @Query('ativas') ativas?: string) {
    return this.alocacoesService.findAll({
      colaboradorId: usuario(req).id,
      ativas: ativas !== 'false',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.alocacoesService.findOne(id, usuario(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateAlocacaoDto, @Req() req: Request) {
    return this.alocacoesService.create(dto, usuario(req).id);
  }

  /**
   * Anexa um termo único a vários registros — a entrega em lote pro mesmo
   * colaborador (checkbox na tela de inventário) gera um registro por item,
   * mas o documento assinado costuma ser um só pra todos.
   */
  @Post('termo-lote')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('termo', TERMO_MULTER_OPTIONS))
  anexarTermoLote(@Body('ids') idsBrutos: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie o termo assinado');
    const ids = (idsBrutos ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.alocacoesService.anexarTermoLote(ids, file);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateAlocacaoDto) {
    return this.alocacoesService.update(id, dto);
  }

  /** Devolver preserva o registro e devolve o item ao estoque. */
  @Post(':id/devolver')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  devolver(@Param('id') id: string, @Body() dto: DevolverAlocacaoDto) {
    return this.alocacoesService.devolver(id, dto);
  }

  /** Cancelar é para lançamento equivocado: não vira devolução no histórico. */
  @Post(':id/cancelar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  cancelar(@Param('id') id: string, @Body() dto: DevolverAlocacaoDto) {
    return this.alocacoesService.cancelar(id, dto.motivoDevolucao);
  }

  /** Devolve ao estoque tudo que está com o colaborador (usado no desligamento). */
  @Post('colaborador/:colaboradorId/devolver-tudo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  devolverTudo(@Param('colaboradorId') colaboradorId: string, @Body() dto: DevolverAlocacaoDto) {
    return this.alocacoesService.devolverTudoDoColaborador(colaboradorId, dto.motivoDevolucao);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.alocacoesService.remove(id);
  }

  /**
   * Termo de responsabilidade assinado: PDF, DOC ou DOCX. Quem assina no
   * Clicksign é o colaborador, então ele também pode importar o PDF e
   * confirmar o aceite aqui — o admin consegue lançar em nome dele também.
   */
  @Post(':id/termo')
  @UseInterceptors(FileInterceptor('termo', TERMO_MULTER_OPTIONS))
  anexarTermo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Envie o termo assinado');
    return this.alocacoesService.anexarTermo(id, file, usuario(req));
  }

  @Delete(':id/termo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  removerTermo(@Param('id') id: string) {
    return this.alocacoesService.removerTermo(id);
  }

  @Get(':id/termo')
  async baixarTermo(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const arquivo = await this.alocacoesService.obterTermo(id, usuario(req));
    res.setHeader('Content-Type', arquivo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
    res.sendFile(arquivo.caminho);
  }
}
