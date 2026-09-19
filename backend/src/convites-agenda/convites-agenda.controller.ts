import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ConvitesAgendaService } from './convites-agenda.service';
import { CreateConviteAgendaDto, UpdateConviteAgendaDto, VerificarConviteAgendaDto } from './dto/convite-agenda.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

/**
 * Convites de agenda em massa: ferramenta de admin para criar um único
 * evento na agenda do organizador (o próprio admin autenticado) com os
 * destinatários como convidados por e-mail — não é preciso conectar nada
 * além da conta de quem envia. Sem rotina própria: é uma ação sensível
 * (convida terceiros em nome do portal), sem caso de uso para delegar a
 * não-admins.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('convites-agenda')
export class ConvitesAgendaController {
  constructor(private readonly service: ConvitesAgendaService) {}

  @Get('colaboradores')
  colaboradores() {
    return this.service.colaboradores();
  }

  @Get('organizador/status')
  organizadorStatus(@Req() req: Request) {
    return this.service.organizadorStatus((req.user as UsuarioAutenticado).id);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** Livre/ocupado de cada e-mail, sem criar nada ainda. */
  @Post('verificar')
  verificar(@Body() dto: VerificarConviteAgendaDto, @Req() req: Request) {
    return this.service.verificar(dto, (req.user as UsuarioAutenticado).id);
  }

  @Post()
  criar(@Body() dto: CreateConviteAgendaDto, @Req() req: Request) {
    return this.service.criar(dto, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateConviteAgendaDto) {
    return this.service.atualizar(id, dto);
  }

  @Post(':id/reenviar')
  reenviar(@Param('id') id: string) {
    return this.service.reenviar(id);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.service.cancelar(id);
  }

  @Post(':id/sincronizar-respostas')
  sincronizarRespostas(@Param('id') id: string) {
    return this.service.sincronizarRespostas(id);
  }

  /** Exclusão definitiva — MASTER only, mais forte que o cancelamento (ADMIN, já exigido pela classe). */
  @Delete(':id')
  @Roles('MASTER')
  remover(@Param('id') id: string) {
    return this.service.remover(id);
  }
}
