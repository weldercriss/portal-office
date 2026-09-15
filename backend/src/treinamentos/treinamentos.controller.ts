import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTreinamentoDto, UpdateParticipacaoDto } from './dto/treinamento.dto';
import { TreinamentosService } from './treinamentos.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('treinamentos')
export class TreinamentosController {
  constructor(private readonly treinamentosService: TreinamentosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.treinamentosService.findAll();
  }

  @Get('me')
  findMeus(@Req() req: Request) {
    return this.treinamentosService.findMeus((req.user as UsuarioAutenticado).id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTreinamentoDto) {
    return this.treinamentosService.create(dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.treinamentosService.remove(id);
  }

  @Patch(':id/participantes/:userId')
  atualizarParticipacao(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateParticipacaoDto,
    @Req() req: Request,
  ) {
    return this.treinamentosService.atualizarParticipacao(id, userId, dto, req.user as UsuarioAutenticado);
  }
}
