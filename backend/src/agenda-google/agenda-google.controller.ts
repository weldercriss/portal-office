import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgendaGoogleOAuthService } from './agenda-google-oauth.service';
import { AgendaGoogleService } from './agenda-google.service';
import { OAUTH_COOKIE, oauthCookieOptions } from './agenda-google.cookie';
import { PreferenciaAgendaDto } from './dto/preferencia-agenda.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('agenda-google')
export class AgendaGoogleController {
  constructor(
    private readonly agenda: AgendaGoogleService,
    private readonly oauth: AgendaGoogleOAuthService,
  ) {}

  @Get('status')
  status(@Req() req: Request) {
    const usuario = req.user as UsuarioAutenticado;
    return this.agenda.statusDoUsuario(usuario.id);
  }

  /**
   * Devolve a URL de consentimento e guarda no cookie o vínculo com este
   * navegador, conferido no retorno do Google.
   */
  @Post('oauth/iniciar')
  @HttpCode(200)
  async iniciar(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const usuario = req.user as UsuarioAutenticado;
    const dono = await this.agenda.emailDoUsuario(usuario.id);
    const { url, browserToken, ttlMs } = await this.oauth.iniciar(usuario.id, dono ?? undefined);
    res.cookie(OAUTH_COOKIE, browserToken, { ...oauthCookieOptions(), maxAge: ttlMs });
    return { url };
  }

  @Patch('preferencia')
  @HttpCode(200)
  preferencia(@Req() req: Request, @Body() dto: PreferenciaAgendaDto) {
    const usuario = req.user as UsuarioAutenticado;
    return this.agenda.definirPreferencia(usuario.id, dto.ativa);
  }

  @Delete('conexao')
  @HttpCode(200)
  desconectar(@Req() req: Request) {
    const usuario = req.user as UsuarioAutenticado;
    return this.agenda.desconectar(usuario.id);
  }
}
