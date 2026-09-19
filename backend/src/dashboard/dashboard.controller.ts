import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles('ADMIN')
  getResumoAdmin() {
    return this.dashboardService.getResumoAdmin();
  }

  @Get('equipe')
  @Roles('GESTOR')
  getResumoEquipe(@Req() req: Request) {
    const usuario = req.user as UsuarioAutenticado;
    return this.dashboardService.getResumoEquipe(usuario.id);
  }
}
