import { Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificacoesService } from './notificacoes.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  findMinhas(@Req() req: Request) {
    return this.notificacoesService.findMinhas((req.user as UsuarioAutenticado).id);
  }

  @Get('nao-lidas/contagem')
  contarNaoLidas(@Req() req: Request) {
    return this.notificacoesService.contarNaoLidas((req.user as UsuarioAutenticado).id);
  }

  @Patch('lidas')
  marcarTodasComoLidas(@Req() req: Request) {
    return this.notificacoesService.marcarTodasComoLidas((req.user as UsuarioAutenticado).id);
  }

  @Delete()
  limparTodas(@Req() req: Request) {
    return this.notificacoesService.limparTodas((req.user as UsuarioAutenticado).id);
  }

  @Patch(':id/lida')
  marcarComoLida(@Param('id') id: string, @Req() req: Request) {
    return this.notificacoesService.marcarComoLida(id, (req.user as UsuarioAutenticado).id);
  }
}
