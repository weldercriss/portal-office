import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequireRotina } from '../auth/rotina.decorator';
import { RotinaGuard } from '../auth/rotina.guard';
import { CreateReservaDto, UpdateReservaDto } from './dto/reserva.dto';
import { ReservasService } from './reservas.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

/**
 * API v1 do agendamento de salas. Consultar a agenda das salas é aberto a quem
 * tem a rotina; registrar e alterar reserva é do admin, que é quem recebe as
 * solicitações hoje.
 */
@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('agendamentos')
@Controller('v1/agendamento/reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get()
  findAll(
    @Query('salaId') salaId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reservasService.findAll({ salaId, solicitanteId, status, from, to });
  }

  @Get('minhas')
  findMinhas(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reservasService.findAll({
      participanteId: (req.user as UsuarioAutenticado).id,
      status,
      from,
      to,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservasService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateReservaDto, @Req() req: Request) {
    return this.reservasService.create(dto, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateReservaDto) {
    return this.reservasService.update(id, dto);
  }

  /** Cancelar libera o horário e preserva o registro; excluir apaga o histórico. */
  @Post(':id/cancelar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  cancelar(@Param('id') id: string, @Body() dto: UpdateReservaDto) {
    return this.reservasService.cancelar(id, dto.motivoCancelamento);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.reservasService.remove(id);
  }
}
