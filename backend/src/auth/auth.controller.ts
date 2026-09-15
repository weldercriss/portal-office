import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleChallengeDto, GoogleLinkDto, GoogleLoginDto } from './dto/google.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const REFRESH_COOKIE = 'refresh_token';
const CHALLENGE_COOKIE = 'google_challenge';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

function refreshCookieOptions() {
  const secure = process.env.COOKIE_SECURE === 'true';
  return {
    path: process.env.COOKIE_PATH ?? '/auth/refresh',
    secure,
    httpOnly: true,
    // 'none' é obrigatório quando frontend e backend ficam em domínios
    // diferentes (ex.: Vercel + Render); só é válido com secure=true.
    sameSite: secure ? ('none' as const) : ('lax' as const),
  };
}

/** O cookie do desafio precisa alcançar todas as rotas de /auth (com o prefixo do proxy). */
function challengeCookieOptions() {
  const { path, ...resto } = refreshCookieOptions();
  return { ...resto, path: path.replace(/\/refresh$/, '') || '/' };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto.email, dto.senha);
    res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { accessToken, user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh token ausente');
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    return { success: true };
  }

  @Get('google/status')
  googleStatus() {
    return { habilitado: this.authService.googleHabilitado };
  }

  @Post('google/challenge')
  @HttpCode(200)
  async googleChallenge(
    @Body() dto: GoogleChallengeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId =
      dto.finalidade === 'VINCULO'
        ? await this.authService.userIdFromAuthorization(req.headers.authorization)
        : undefined;
    const { nonce, browserToken, expiraEm, ttlMs } = await this.authService.createGoogleChallenge(
      dto.finalidade,
      userId,
    );
    res.cookie(CHALLENGE_COOKIE, browserToken, { ...challengeCookieOptions(), maxAge: ttlMs });
    return { nonce, expiraEm };
  }

  @Post('google')
  @HttpCode(200)
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.loginWithGoogle(
      dto.credential,
      req.cookies?.[CHALLENGE_COOKIE],
    );
    res.clearCookie(CHALLENGE_COOKIE, challengeCookieOptions());
    res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { accessToken, user };
  }

  @Post('google/link')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async googleLink(
    @Body() dto: GoogleLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const usuario = req.user as UsuarioAutenticado;
    const vinculo = await this.authService.linkGoogle(
      usuario.id,
      dto.credential,
      dto.senha,
      req.cookies?.[CHALLENGE_COOKIE],
    );
    res.clearCookie(CHALLENGE_COOKIE, challengeCookieOptions());
    return vinculo;
  }
}
