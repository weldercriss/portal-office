import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TipoChecklist } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { CreateChecklistItemDto, TipoChecklistDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';
import { OnboardingService } from './onboarding.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

/** Escrita continua self-or-admin — GESTOR não edita checklist da equipe, só lê (ver findAll). */
function garantirAcessoEscrita(req: Request, userId: string) {
  const usuario = req.user as UsuarioAutenticado;
  if (!ehAdminOuSuperior(usuario.role) && usuario.id !== userId) {
    throw new ForbiddenException('Você não tem acesso ao checklist deste colaborador');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('colaboradores/:userId/checklist')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Req() req: Request, @Query('tipo') tipo?: TipoChecklistDto) {
    return this.onboardingService.findAll(userId, req.user as UsuarioAutenticado, tipo as TipoChecklist | undefined);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Param('userId') userId: string, @Body() dto: CreateChecklistItemDto) {
    return this.onboardingService.create(userId, dto);
  }

  @Post('padrao')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  gerarPadrao(@Param('userId') userId: string, @Body('tipo') tipo?: TipoChecklistDto) {
    return this.onboardingService.gerarPadrao(userId, tipo as TipoChecklist | undefined);
  }

  @Patch(':id')
  update(@Param('userId') userId: string, @Param('id') id: string, @Body() dto: UpdateChecklistItemDto, @Req() req: Request) {
    garantirAcessoEscrita(req, userId);
    const usuario = req.user as UsuarioAutenticado;
    if (dto.observacaoInterna !== undefined && !ehAdminOuSuperior(usuario.role)) {
      throw new ForbiddenException('Só administradores registram observação interna');
    }
    return this.onboardingService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.onboardingService.remove(id);
  }
}
