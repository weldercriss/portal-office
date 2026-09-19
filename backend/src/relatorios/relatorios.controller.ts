import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RelatoriosService } from './relatorios.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('turnover')
  getTurnover(
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('departamentoId') departamentoId?: string,
  ) {
    return this.relatoriosService.getTurnover({ de, ate, departamentoId });
  }

  @Get('colaboradores')
  getColaboradores(@Query('departamentoId') departamentoId?: string) {
    return this.relatoriosService.getColaboradores({ departamentoId });
  }
}
