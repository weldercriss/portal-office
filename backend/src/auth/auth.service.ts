import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PermissoesService } from '../permissoes/permissoes.service';
import { PrismaService } from '../prisma/prisma.service';
import type { FinalidadeDesafio } from './dto/google.dto';
import { GoogleAuthService, type PerfilGoogle } from './google-auth.service';
import type { AppRole } from './roles.util';

export interface JwtPayload {
  sub: string;
  role: AppRole;
}

interface UsuarioDaSessao {
  id: string;
  nome: string;
  email: string;
  role: string;
  senhaHash: string;
}

export const DESAFIO_INVALIDO = 'Desafio de autenticação inválido ou expirado. Tente novamente.';
export const CONTA_NAO_VINCULADA =
  'Conta Google não vinculada. Entre com e-mail e senha e vincule a conta no seu perfil.';

const DESAFIO_TTL_MS = 10 * 60 * 1000;

function hashDesafio(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly permissoesService: PermissoesService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  async validateCredentials(email: string, senha: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.ativo || !user.acessoPlataforma) throw new UnauthorizedException('Credenciais inválidas');
    // Conta criada pelo Google ainda não tem senha: só entra pelo Google.
    if (!user.senhaHash) throw new UnauthorizedException('Credenciais inválidas');
    const senhaValida = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');
    return user;
  }

  /** Emissão de sessão compartilhada pelo login por senha e pelo login com Google. */
  private async issueSession(user: UsuarioDaSessao) {
    const payload: JwtPayload = { sub: user.id, role: user.role as AppRole };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });
    const rotinas = await this.permissoesService.resolveRotinas(user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        rotinas,
        temSenha: user.senhaHash !== '',
      },
    };
  }

  async login(email: string, senha: string) {
    const user = await this.validateCredentials(email, senha);
    return this.issueSession(user);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    // A conta pode ter sido desativada depois da emissão do refresh token.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.ativo || !user.acessoPlataforma) throw new UnauthorizedException('Sessão encerrada. Entre novamente.');
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m' },
    );
    return { accessToken };
  }

  /** Identifica o usuário do access token sem guard, para rotas de acesso misto. */
  async userIdFromAuthorization(authorization?: string): Promise<string> {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sessão necessária');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: process.env.JWT_ACCESS_SECRET });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, ativo: true, acessoPlataforma: true },
      });
      if (!user || !user.ativo || !user.acessoPlataforma) throw new UnauthorizedException('Sessão encerrada.');
      return user.id;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
  }

  get googleHabilitado(): boolean {
    return this.googleAuth.habilitado;
  }

  /**
   * Emite um desafio de uso único: o nonce vai ao Google e volta dentro do ID
   * token; o token do navegador viaja apenas no cookie da resposta.
   */
  async createGoogleChallenge(finalidade: FinalidadeDesafio, userId?: string) {
    this.googleAuth.ensureHabilitado();
    const nonce = randomBytes(32).toString('base64url');
    const browserToken = randomBytes(32).toString('base64url');
    const expiraEm = new Date(Date.now() + DESAFIO_TTL_MS);

    await this.prisma.authChallenge.deleteMany({ where: { expiraEm: { lt: new Date() } } });
    await this.prisma.authChallenge.create({
      data: {
        nonceHash: hashDesafio(nonce),
        browserHash: hashDesafio(browserToken),
        finalidade,
        userId: userId ?? null,
        expiraEm,
      },
    });

    return { nonce, browserToken, expiraEm, ttlMs: DESAFIO_TTL_MS };
  }

  /** Consome o desafio de forma atômica: só a primeira exclusão encontra a linha. */
  private async consumeGoogleChallenge(
    nonce: string,
    browserToken: string | undefined,
    finalidade: FinalidadeDesafio,
    userId?: string,
  ) {
    if (!browserToken) throw new UnauthorizedException(DESAFIO_INVALIDO);
    const { count } = await this.prisma.authChallenge.deleteMany({
      where: {
        nonceHash: hashDesafio(nonce),
        browserHash: hashDesafio(browserToken),
        finalidade,
        userId: userId ?? null,
        expiraEm: { gt: new Date() },
      },
    });
    if (count !== 1) throw new UnauthorizedException(DESAFIO_INVALIDO);
  }

  async loginWithGoogle(credential: string, browserToken?: string) {
    const perfil = await this.googleAuth.verifyCredential(credential);
    await this.consumeGoogleChallenge(perfil.nonce, browserToken, 'LOGIN');

    const vinculado = await this.prisma.user.findUnique({ where: { googleSub: perfil.sub } });
    if (vinculado) {
      if (!vinculado.ativo || !vinculado.acessoPlataforma) throw new UnauthorizedException('Credenciais inválidas');
      return this.issueSession(vinculado);
    }
    return this.issueSession(await this.provisionarPorDominio(perfil));
  }

  /**
   * Primeiro acesso pelo Google. Só contas de um domínio corporativo confiável,
   * confirmado pelo campo `hd` do ID token, ganham vínculo ou cadastro
   * automático; as demais precisam do vínculo manual, com senha.
   */
  private async provisionarPorDominio(perfil: PerfilGoogle) {
    if (!this.googleAuth.autoProvisionHabilitado || !this.googleAuth.dominioConfiavel(perfil.hd)) {
      throw new UnauthorizedException(CONTA_NAO_VINCULADA);
    }

    const existente = await this.prisma.user.findFirst({
      where: { email: { equals: perfil.email, mode: 'insensitive' } },
    });
    if (existente) {
      // Conta desativada nunca é revivida nem recriada por um login Google.
      if (!existente.ativo || !existente.acessoPlataforma) throw new UnauthorizedException('Credenciais inválidas');
      if (existente.googleSub) {
        throw new ConflictException('Este usuário já possui outra conta Google vinculada.');
      }
      return this.prisma.user.update({
        where: { id: existente.id },
        data: { googleSub: perfil.sub, googleLinkedAt: new Date() },
      });
    }

    // Entra sem departamento e sem rotinas: o admin concede os acessos depois.
    // A senha fica vazia até a pessoa definir uma no próprio perfil.
    return this.prisma.user.create({
      data: {
        nome: perfil.nome?.trim() || perfil.email,
        email: perfil.email.trim().toLowerCase(),
        senhaHash: '',
        acessoPlataforma: true,
        role: 'USER',
        googleSub: perfil.sub,
        googleLinkedAt: new Date(),
      },
    });
  }

  async linkGoogle(userId: string, credential: string, senha: string, browserToken?: string) {
    const perfil = await this.googleAuth.verifyCredential(credential);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ativo || !user.acessoPlataforma) throw new UnauthorizedException('Credenciais inválidas');
    const senhaValida = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Senha atual incorreta');

    if (user.googleSub && user.googleSub !== perfil.sub) {
      throw new ConflictException('Este usuário já possui outra conta Google vinculada.');
    }
    if (user.email.trim().toLowerCase() !== perfil.email.trim().toLowerCase()) {
      throw new ForbiddenException('A conta Google precisa usar o mesmo e-mail do cadastro.');
    }
    const emUso = await this.prisma.user.findUnique({ where: { googleSub: perfil.sub } });
    if (emUso && emUso.id !== userId) {
      throw new ConflictException('Esta conta Google já está vinculada a outro usuário.');
    }

    await this.consumeGoogleChallenge(perfil.nonce, browserToken, 'VINCULO', userId);

    const atualizado = await this.prisma.user.update({
      where: { id: userId },
      data: { googleSub: perfil.sub, googleLinkedAt: user.googleLinkedAt ?? new Date() },
      select: { email: true, googleLinkedAt: true },
    });
    return { email: atualizado.email, googleLinkedAt: atualizado.googleLinkedAt };
  }
}
