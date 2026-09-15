import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist-item.dto';
import { OnboardingService } from './onboarding.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

function garantirAcesso(req: Request, userId: string) {
  const usuario = req.user as UsuarioAutenticado;
  if (usuario.role !== 'ADMIN' && usuario.id !== userId) {
    throw new ForbiddenException('Você não tem acesso ao checklist deste colaborador');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('colaboradores/:userId/checklist')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  findAll(@Param('userId') userId: string, @Req() req: Request) {
    garantirAcesso(req, userId);
    return this.onboardingService.findAll(userId);
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
  gerarPadrao(@Param('userId') userId: string) {
    return this.onboardingService.gerarPadrao(userId);
  }

  @Patch(':id')
  update(@Param('userId') userId: string, @Param('id') id: string, @Body() dto: UpdateChecklistItemDto, @Req() req: Request) {
    garantirAcesso(req, userId);
    return this.onboardingService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.onboardingService.remove(id);
  }
}
