import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePesquisaDto } from './dto/create-pesquisa.dto';
import { ResponderPesquisaDto } from './dto/responder-pesquisa.dto';
import { PesquisasService } from './pesquisas.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

/**
 * Pesquisas anônimas (NPS/NR-1) e feedback 1:1. Criar/listar/encerrar e ver o resultado
 * agregado é exclusivo de ADMIN+; qualquer colaborador autenticado só vê seus próprios
 * convites pendentes e responde — nunca o resultado agregado de outra pessoa.
 */
@UseGuards(JwtAuthGuard)
@Controller('pesquisas')
export class PesquisasController {
  constructor(private readonly service: PesquisasService) {}

  @Get('pendentes')
  pendentes(@Req() req: Request) {
    return this.service.pendentes((req.user as UsuarioAutenticado).id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listar() {
    return this.service.listar();
  }

  @Get(':id/resultado')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  resultado(@Param('id') id: string) {
    return this.service.resultado(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreatePesquisaDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id/encerrar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  encerrar(@Param('id') id: string) {
    return this.service.encerrar(id);
  }

  /** Exclusão definitiva — MASTER only, mais forte que o encerramento (ADMIN). */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('MASTER')
  remover(@Param('id') id: string) {
    return this.service.remover(id);
  }

  @Post(':id/responder')
  responder(@Param('id') id: string, @Body() dto: ResponderPesquisaDto, @Req() req: Request) {
    return this.service.responder(id, (req.user as UsuarioAutenticado).id, dto);
  }
}
