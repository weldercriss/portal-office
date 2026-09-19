import { Body, Controller, ForbiddenException, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { DadosSensiveisService } from './dados-sensiveis.service';
import { UpdateDadosSensiveisDto } from './dto/update-dados-sensiveis.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

/** Dado sensível demais para o acesso de equipe do GESTOR — self-or-admin, sem terceiro caso. */
function garantirAcessoLeitura(req: Request, userId: string) {
  const usuario = req.user as UsuarioAutenticado;
  if (!ehAdminOuSuperior(usuario.role) && usuario.id !== userId) {
    throw new ForbiddenException('Você não tem acesso aos dados sensíveis deste colaborador');
  }
}

/** O próprio colaborador só lê — edição é sempre feita pelo RH (admin), mesmo sendo dado autodeclarado. */
function garantirAcessoEscrita(req: Request) {
  const usuario = req.user as UsuarioAutenticado;
  if (!ehAdminOuSuperior(usuario.role)) {
    throw new ForbiddenException('Você não tem acesso aos dados sensíveis deste colaborador');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('colaboradores/:userId/dados-sensiveis')
export class DadosSensiveisController {
  constructor(private readonly dadosSensiveisService: DadosSensiveisService) {}

  @Get()
  findOne(@Param('userId') userId: string, @Req() req: Request) {
    garantirAcessoLeitura(req, userId);
    return this.dadosSensiveisService.findOne(userId);
  }

  @Patch()
  update(@Param('userId') userId: string, @Body() dto: UpdateDadosSensiveisDto, @Req() req: Request) {
    garantirAcessoEscrita(req);
    return this.dadosSensiveisService.update(userId, dto);
  }
}
