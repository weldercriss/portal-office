import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateHistoricoDto, UpdateHistoricoDto } from './dto/historico.dto';
import { HistoricoService } from './historico.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('colaboradores/:userId/historico')
export class HistoricoController {
  constructor(private readonly historicoService: HistoricoService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Req() req: Request) {
    return this.historicoService.findAll(userId, req.user as UsuarioAutenticado);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Param('userId') userId: string, @Body() dto: CreateHistoricoDto) {
    return this.historicoService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateHistoricoDto) {
    return this.historicoService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.historicoService.remove(id);
  }
}
