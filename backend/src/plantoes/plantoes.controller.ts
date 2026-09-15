import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequireRotina } from '../auth/rotina.decorator';
import { RotinaGuard } from '../auth/rotina.guard';
import { CreatePlantaoDto } from './dto/create-plantao.dto';
import { SolicitarTrocaDto } from './dto/solicitar-troca.dto';
import { UpdatePlantaoDto } from './dto/update-plantao.dto';
import { PlantoesService } from './plantoes.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('plantoes')
@Controller('plantoes')
export class PlantoesController {
  constructor(private readonly plantoesService: PlantoesService) {}

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.plantoesService.findAll({ userId, status, from, to });
  }

  @Get('trocas')
  findTrocas(@Req() req: Request) {
    const usuario = req.user as UsuarioAutenticado;
    return this.plantoesService.findTrocas(usuario.id, usuario.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plantoesService.findOne(id);
  }

  @Get(':id/trocas-disponiveis')
  findDisponiveisParaTroca(@Param('id') id: string, @Req() req: Request) {
    return this.plantoesService.findDisponiveisParaTroca(id, (req.user as UsuarioAutenticado).id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreatePlantaoDto, @Req() req: Request) {
    return this.plantoesService.create(dto, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdatePlantaoDto) {
    return this.plantoesService.update(id, dto);
  }

  @Delete('serie/:serieId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  removeSerie(@Param('serieId') serieId: string) {
    return this.plantoesService.removeSerie(serieId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.plantoesService.remove(id);
  }

  @Post(':id/trocas')
  solicitarTroca(@Param('id') id: string, @Body() dto: SolicitarTrocaDto, @Req() req: Request) {
    return this.plantoesService.solicitarTroca(id, dto.plantaoDestinoId, (req.user as UsuarioAutenticado).id);
  }

  @Post('trocas/:id/aceitar')
  aceitarTroca(@Param('id') id: string, @Req() req: Request) {
    return this.plantoesService.aceitarTroca(id, (req.user as UsuarioAutenticado).id);
  }

  @Post('trocas/:id/rejeitar')
  rejeitarTroca(@Param('id') id: string, @Req() req: Request) {
    return this.plantoesService.rejeitarTroca(id, (req.user as UsuarioAutenticado).id);
  }
}
