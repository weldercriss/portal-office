import { randomBytes } from 'crypto';
import { AgendaGoogleCrypto } from './agenda-google.crypto';

const CHAVE = randomBytes(32).toString('base64');
const OUTRA_CHAVE = randomBytes(32).toString('base64');

describe('AgendaGoogleCrypto', () => {
  let cripto: AgendaGoogleCrypto;

  beforeEach(() => {
    cripto = new AgendaGoogleCrypto();
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = CHAVE;
  });

  afterEach(() => {
    delete process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  });

  it('não se considera configurada sem chave', () => {
    delete process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
    expect(cripto.configurada).toBe(false);
  });

  it('recusa chave fora de 32 bytes', () => {
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = randomBytes(16).toString('base64');
    expect(cripto.configurada).toBe(false);
    expect(() => cripto.criptografar('token')).toThrow(/32 bytes/);
  });

  it('devolve o mesmo texto depois de ir e voltar', () => {
    const guardado = cripto.criptografar('1//refresh-token-do-google');
    expect(cripto.descriptografar(guardado)).toBe('1//refresh-token-do-google');
  });

  it('não guarda o token em texto puro', () => {
    const guardado = cripto.criptografar('1//refresh-token-do-google');
    expect(guardado).not.toContain('refresh-token-do-google');
    expect(guardado.startsWith('v1.')).toBe(true);
  });

  it('usa IV novo a cada gravação', () => {
    expect(cripto.criptografar('igual')).not.toBe(cripto.criptografar('igual'));
  });

  it('recusa conteúdo adulterado em vez de devolver lixo', () => {
    const [versao, iv, tag, conteudo] = cripto.criptografar('token').split('.');
    const trocado = [versao, iv, tag, Buffer.from('outro valor').toString('base64url')].join('.');
    expect(cripto.descriptografar(trocado)).toBeNull();
    expect(cripto.descriptografar('formato-errado')).toBeNull();
    expect(cripto.descriptografar(`v9.${iv}.${tag}.${conteudo}`)).toBeNull();
  });

  it('não abre o que foi guardado com outra chave', () => {
    const guardado = cripto.criptografar('token');
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = OUTRA_CHAVE;
    expect(cripto.descriptografar(guardado)).toBeNull();
  });
});
