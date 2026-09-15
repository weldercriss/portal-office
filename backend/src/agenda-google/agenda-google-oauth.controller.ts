import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AgendaGoogleOAuthService } from './agenda-google-oauth.service';
import { AgendaGoogleService } from './agenda-google.service';
import { OAUTH_COOKIE, oauthCookieOptions } from './agenda-google.cookie';

/** Só a origem configurada recebe o retorno; nada vindo do navegador decide o destino. */
function destino(parametros: string): string {
  const base = (process.env.APP_PUBLIC_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')[0]!
    .trim()
    .replace(/\/+$/, '');
  return `${base}/perfil?${parametros}`;
}

/**
 * Retorno do consentimento do Google. Fica fora do guard de JWT de propósito: a
 * navegação de volta do Google não carrega o Bearer token do frontend. A
 * identidade vem do `state` de uso único somado ao cookie deste navegador.
 */
@Controller('agenda-google/oauth')
export class AgendaGoogleOAuthController {
  constructor(
    private readonly oauth: AgendaGoogleOAuthService,
    private readonly agenda: AgendaGoogleService,
  ) {}

  @Get('callback')
  async callback(
    @Query('state') state: string | undefined,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const resultado = await this.oauth.concluir({
      state,
      code,
      error,
      browserToken: req.cookies?.[OAUTH_COOKIE],
    });
    res.clearCookie(OAUTH_COOKIE, oauthCookieOptions());

    if (!resultado.ok) {
      return res.redirect(destino(`agendaGoogle=erro&motivo=${resultado.motivo ?? 'falha'}`));
    }

    // Retoma os plantões futuros e as pendências que esperavam esta conexão.
    await this.agenda.reprocessarDoUsuario(resultado.userId!);
    return res.redirect(destino('agendaGoogle=conectada'));
  }
}
