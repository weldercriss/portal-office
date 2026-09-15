import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
 * Convites de agenda em massa: ferramenta de admin para criar um evento na
 * agenda de vários colaboradores de uma vez, reaproveitando a autorização
 * individual da Agenda Google que cada um já concedeu em Meu perfil. Sem
 * rotina própria: é uma ação sensível (escreve na agenda de terceiros), sem
 * caso de uso para delegar a não-admins.
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

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** Checagem de divergência antes de enviar, sem criar nada ainda. */
  @Post('verificar')
  verificar(@Body() dto: VerificarConviteAgendaDto) {
    return this.service.verificar(dto);
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
}
