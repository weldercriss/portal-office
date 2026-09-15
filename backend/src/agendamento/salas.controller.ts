import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequireRotina } from '../auth/rotina.decorator';
import { RotinaGuard } from '../auth/rotina.guard';
import { CreateSalaDto, UpdateSalaDto } from './dto/sala.dto';
import { SalasService } from './salas.service';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * API v1 do agendamento de salas: só o painel interno consome. A v2 fica livre
 * para integrações com outros portais, sem prender este contrato.
 */
@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('agendamentos')
@Controller('v1/agendamento/salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.salasService.findAll(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salasService.findOne(id);
  }

  /** Horários da sala num dia, já marcando o que foi tomado por outra reserva. */
  @Get(':id/horarios')
  horarios(@Param('id') id: string, @Query('data') data: string, @Query('ignorarReservaId') ignorar?: string) {
    if (!data || !DATA.test(data)) {
      throw new BadRequestException('Informe a data no formato YYYY-MM-DD');
    }
    return this.salasService.horariosDisponiveis(id, data, ignorar);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateSalaDto) {
    return this.salasService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateSalaDto) {
    return this.salasService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.salasService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string) {
    return this.salasService.deletePermanently(id);
  }
}
