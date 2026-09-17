import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LogsAplicacaoService } from './logs-aplicacao.service';

/**
 * Histórico técnico das requisições HTTP recebidas pela API — exclusivo do
 * usuário master (administração de plataforma), não de admins comuns.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MASTER')
@Controller('logs-aplicacao')
export class LogsAplicacaoController {
  constructor(private readonly service: LogsAplicacaoService) {}

  @Get()
  listar(
    @Query('resultado') resultado?: string,
    @Query('metodo') metodo?: string,
    @Query('statusHttp') statusHttp?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('busca') busca?: string,
  ) {
    return this.service.listar({
      resultado,
      metodo,
      statusHttp: statusHttp ? Number(statusHttp) : undefined,
      usuarioId,
      busca,
    });
  }

  @Get(':id')
  obterDetalhe(@Param('id') id: string) {
    return this.service.obterDetalhe(id);
  }
}
