import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSAO = 'v1';
const IV_BYTES = 12;
const CHAVE_BYTES = 32;

/**
 * Protege o refresh token da agenda em repouso com AES-256-GCM. O token precisa
 * voltar em texto puro para renovar o acesso, então não serve hash: o formato
 * guarda versão, IV aleatório e a tag de autenticação junto do ciphertext.
 */
@Injectable()
export class AgendaGoogleCrypto {
  private chaveCache: Buffer | null = null;
  private chaveBruta = '';

  /** Chave de 32 bytes em base64. Independente dos segredos JWT do login. */
  private chave(): Buffer | null {
    const bruta = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY?.trim() ?? '';
    if (!bruta) return null;
    if (this.chaveCache && this.chaveBruta === bruta) return this.chaveCache;

    const chave = Buffer.from(bruta, 'base64');
    if (chave.length !== CHAVE_BYTES) return null;

    this.chaveCache = chave;
    this.chaveBruta = bruta;
    return chave;
  }

  get configurada(): boolean {
    return this.chave() !== null;
  }

  criptografar(texto: string): string {
    const chave = this.chave();
    if (!chave) throw new Error('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY ausente ou fora de 32 bytes em base64');

    const iv = randomBytes(IV_BYTES);
    const cifra = createCipheriv('aes-256-gcm', chave, iv);
    const conteudo = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
    return [VERSAO, iv.toString('base64url'), cifra.getAuthTag().toString('base64url'), conteudo.toString('base64url')].join(
      '.',
    );
  }

  /** Retorna null quando o valor guardado não abre com a chave atual. */
  descriptografar(valor: string): string | null {
    const chave = this.chave();
    if (!chave) return null;

    const [versao, iv, tag, conteudo] = valor.split('.');
    if (versao !== VERSAO || !iv || !tag || !conteudo) return null;

    try {
      const decifra = createDecipheriv('aes-256-gcm', chave, Buffer.from(iv, 'base64url'));
      decifra.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decifra.update(Buffer.from(conteudo, 'base64url')), decifra.final()]).toString('utf8');
    } catch {
      return null;
    }
  }
}
