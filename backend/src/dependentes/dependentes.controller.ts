import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { DependentesService } from './dependentes.service';
import { CreateDependenteDto, UpdateDependenteDto } from './dto/dependente.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

function garantirAcesso(req: Request, userId: string) {
  const usuario = req.user as UsuarioAutenticado;
  if (!ehAdminOuSuperior(usuario.role) && usuario.id !== userId) {
    throw new ForbiddenException('Você não tem acesso aos dados deste colaborador');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('colaboradores/:userId/dependentes')
export class DependentesController {
  constructor(private readonly dependentesService: DependentesService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Req() req: Request) {
    garantirAcesso(req, userId);
    return this.dependentesService.findAll(userId);
  }

  @Post()
  create(@Param('userId') userId: string, @Body() dto: CreateDependenteDto, @Req() req: Request) {
    garantirAcesso(req, userId);
    return this.dependentesService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDependenteDto,
    @Req() req: Request,
  ) {
    garantirAcesso(req, userId);
    return this.dependentesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('userId') userId: string, @Param('id') id: string, @Req() req: Request) {
    garantirAcesso(req, userId);
    return this.dependentesService.remove(id);
  }
}
