import { GoogleAuthService } from './google-auth.service';

const verifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  const payloadValido = {
    sub: 'google-1',
    email: 'ana@empresa.com',
    email_verified: true,
    name: 'Ana',
    picture: 'https://lh3.googleusercontent.com/foto-ana',
    nonce: 'desafio',
  };

  function mockPayload(payload: Record<string, unknown> | undefined) {
    verifyIdToken.mockResolvedValue({ getPayload: () => payload });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_AUTH_ENABLED = 'true';
    process.env.GOOGLE_CLIENT_ID = 'client-id.apps.googleusercontent.com';
    delete process.env.GOOGLE_ALLOWED_DOMAIN;
    delete process.env.GOOGLE_ALLOWED_DOMAINS;
    delete process.env.GOOGLE_AUTO_PROVISION;
    service = new GoogleAuthService();
  });

  afterAll(() => {
    delete process.env.GOOGLE_AUTH_ENABLED;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_ALLOWED_DOMAIN;
  });

  it('valida a credencial contra o Client ID configurado', async () => {
    mockPayload(payloadValido);
    const perfil = await service.verifyCredential('credencial');
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'credencial',
      audience: 'client-id.apps.googleusercontent.com',
    });
    expect(perfil).toEqual({
      sub: 'google-1',
      email: 'ana@empresa.com',
      nome: 'Ana',
      foto: 'https://lh3.googleusercontent.com/foto-ana',
      nonce: 'desafio',
    });
  });

  it('recusa credencial rejeitada pela biblioteca (assinatura, emissor, destinatário ou expiração)', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
    await expect(service.verifyCredential('credencial')).rejects.toThrow('Credencial do Google inválida ou expirada');
  });

  it('recusa credencial sem nonce', async () => {
    mockPayload({ ...payloadValido, nonce: undefined });
    await expect(service.verifyCredential('credencial')).rejects.toThrow('Credencial do Google inválida ou expirada');
  });

  it('recusa e-mail não verificado', async () => {
    mockPayload({ ...payloadValido, email_verified: false });
    await expect(service.verifyCredential('credencial')).rejects.toThrow('não está verificado');
  });

  it('recusa domínio diferente do permitido usando o campo hd', async () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'empresa.com';
    mockPayload({ ...payloadValido, email: 'ana@empresa.com.br', hd: 'empresa.com.br' });
    await expect(service.verifyCredential('credencial')).rejects.toThrow('Domínio da conta Google não autorizado');
  });

  it('aceita o domínio permitido', async () => {
    process.env.GOOGLE_ALLOWED_DOMAIN = 'empresa.com';
    mockPayload({ ...payloadValido, hd: 'empresa.com' });
    await expect(service.verifyCredential('credencial')).resolves.toMatchObject({ sub: 'google-1' });
  });

  it('aceita qualquer domínio da lista e recusa os demais', async () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = 'chatbotmaker.io, suri.ai';
    expect(service.dominiosPermitidos).toEqual(['chatbotmaker.io', 'suri.ai']);

    mockPayload({ ...payloadValido, email: 'welder@suri.ai', hd: 'suri.ai' });
    await expect(service.verifyCredential('credencial')).resolves.toMatchObject({ hd: 'suri.ai' });

    mockPayload({ ...payloadValido, email: 'alguem@outra.com', hd: 'outra.com' });
    await expect(service.verifyCredential('credencial')).rejects.toThrow('Domínio da conta Google não autorizado');
    delete process.env.GOOGLE_ALLOWED_DOMAINS;
  });

  it('não confia em conta sem hd, mesmo com e-mail do domínio', () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = 'suri.ai';
    expect(service.dominioConfiavel(undefined)).toBe(false);
    expect(service.dominioConfiavel('suri.ai')).toBe(true);
    delete process.env.GOOGLE_ALLOWED_DOMAINS;
  });

  it('só habilita o cadastro automático com lista de domínios', () => {
    process.env.GOOGLE_AUTO_PROVISION = 'true';
    delete process.env.GOOGLE_ALLOWED_DOMAINS;
    expect(service.autoProvisionHabilitado).toBe(false);

    process.env.GOOGLE_ALLOWED_DOMAINS = 'suri.ai';
    expect(service.autoProvisionHabilitado).toBe(true);

    process.env.GOOGLE_AUTO_PROVISION = 'false';
    expect(service.autoProvisionHabilitado).toBe(false);
    delete process.env.GOOGLE_AUTO_PROVISION;
    delete process.env.GOOGLE_ALLOWED_DOMAINS;
  });

  it('recusa a validação quando a integração está desabilitada', async () => {
    process.env.GOOGLE_AUTH_ENABLED = 'false';
    expect(service.habilitado).toBe(false);
    await expect(service.verifyCredential('credencial')).rejects.toThrow('Login com Google indisponível');
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
