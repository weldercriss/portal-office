import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export interface PerfilGoogle {
  sub: string;
  email: string;
  nome?: string;
  /** Domínio do Workspace declarado pelo Google. Ausente em conta pessoal. */
  hd?: string;
  nonce: string;
}

const CREDENCIAL_INVALIDA = 'Credencial do Google inválida ou expirada';

/**
 * Valida o ID token emitido pelo Google Identity Services. A biblioteca confere
 * assinatura, emissor, destinatário e expiração; aqui ficam as regras do portal:
 * e-mail verificado, domínio permitido e presença do nonce do desafio.
 */
@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client | null = null;
  private clientIdDoCliente = '';

  get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  }

  get habilitado(): boolean {
    return process.env.GOOGLE_AUTH_ENABLED === 'true' && this.clientId !== '';
  }

  /** Domínios corporativos aceitos. `GOOGLE_ALLOWED_DOMAIN` segue valendo como valor único. */
  get dominiosPermitidos(): string[] {
    const bruto = process.env.GOOGLE_ALLOWED_DOMAINS ?? process.env.GOOGLE_ALLOWED_DOMAIN ?? '';
    return bruto
      .split(',')
      .map((dominio) => dominio.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * O cadastro automático exige lista de domínios: sem ela, qualquer conta Google
   * do mundo viraria usuário do portal.
   */
  get autoProvisionHabilitado(): boolean {
    return process.env.GOOGLE_AUTO_PROVISION === 'true' && this.dominiosPermitidos.length > 0;
  }

  /** Confia no campo `hd` do token, nunca no sufixo do e-mail, que é forjável. */
  dominioConfiavel(hd?: string): boolean {
    if (!hd) return false;
    return this.dominiosPermitidos.includes(hd.trim().toLowerCase());
  }

  ensureHabilitado() {
    if (!this.habilitado) throw new ServiceUnavailableException('Login com Google indisponível');
  }

  private getClient(): OAuth2Client {
    if (!this.client || this.clientIdDoCliente !== this.clientId) {
      this.client = new OAuth2Client(this.clientId);
      this.clientIdDoCliente = this.clientId;
    }
    return this.client;
  }

  async verifyCredential(credential: string): Promise<PerfilGoogle> {
    this.ensureHabilitado();

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.getClient().verifyIdToken({ idToken: credential, audience: this.clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(CREDENCIAL_INVALIDA);
    }

    if (!payload?.sub || !payload.email || !payload.nonce) throw new UnauthorizedException(CREDENCIAL_INVALIDA);
    if (!payload.email_verified) throw new UnauthorizedException('O e-mail da conta Google não está verificado');

    if (this.dominiosPermitidos.length > 0 && !this.dominioConfiavel(payload.hd)) {
      throw new UnauthorizedException('Domínio da conta Google não autorizado');
    }

    return { sub: payload.sub, email: payload.email, nome: payload.name, hd: payload.hd, nonce: payload.nonce };
  }
}
