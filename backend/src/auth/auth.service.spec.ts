import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { PermissoesService } from '../permissoes/permissoes.service';
import { PrismaService } from '../prisma/prisma.service';

interface DesafioArmazenado {
  nonceHash: string;
  browserHash: string;
  finalidade: string;
  userId: string | null;
  expiraEm: Date;
}

/** Reproduz os filtros usados pelo serviço, para exercitar o consumo do desafio. */
function corresponde(desafio: DesafioArmazenado, where: Record<string, any>): boolean {
  if (where.nonceHash && desafio.nonceHash !== where.nonceHash) return false;
  if (where.browserHash && desafio.browserHash !== where.browserHash) return false;
  if (where.finalidade && desafio.finalidade !== where.finalidade) return false;
  if ('userId' in where && (desafio.userId ?? null) !== (where.userId ?? null)) return false;
  if (where.expiraEm?.gt && !(desafio.expiraEm > where.expiraEm.gt)) return false;
  if (where.expiraEm?.lt && !(desafio.expiraEm < where.expiraEm.lt)) return false;
  return true;
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  const senhaHash = bcrypt.hashSync('senha123', 10);
  const desafios: DesafioArmazenado[] = [];

  const prismaMock = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    authChallenge: {
      create: jest.fn(async ({ data }: { data: DesafioArmazenado }) => {
        desafios.push({ ...data });
        return data;
      }),
      deleteMany: jest.fn(async ({ where }: { where: Record<string, any> }) => {
        const mantidos = desafios.filter((desafio) => !corresponde(desafio, where));
        const count = desafios.length - mantidos.length;
        desafios.splice(0, desafios.length, ...mantidos);
        return { count };
      }),
    },
  };
  const permissoesMock = { resolveRotinas: jest.fn().mockResolvedValue([]) };
  const googleMock = {
    habilitado: true,
    autoProvisionHabilitado: false,
    ensureHabilitado: jest.fn(),
    verifyCredential: jest.fn(),
    dominioConfiavel: jest.fn(),
  };

  const usuarioAtivo = {
    id: '1',
    nome: 'Ana',
    email: 'ana@empresa.com',
    senhaHash,
    ativo: true, acessoPlataforma: true,
    role: 'USER',
    googleSub: null as string | null,
    googleLinkedAt: null as Date | null,
  };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    desafios.length = 0;
    googleMock.autoProvisionHabilitado = false;
    googleMock.dominioConfiavel.mockReturnValue(false);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PermissoesService, useValue: permissoesMock },
        { provide: GoogleAuthService, useValue: googleMock },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  it('rejects wrong password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo });
    await expect(service.validateCredentials('ana@empresa.com', 'errada')).rejects.toThrow('Credenciais inválidas');
  });

  it('accepts correct password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo });
    const user = await service.validateCredentials('ana@empresa.com', 'senha123');
    expect(user.id).toBe('1');
  });

  it('rejects password login when platform access is disabled even with a stored password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, acessoPlataforma: false });
    await expect(service.login('ana@empresa.com', 'senha123')).rejects.toThrow('Credenciais inválidas');
  });

  it('rejects existing refresh and access tokens after access is revoked', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, acessoPlataforma: false });
    const refresh = await jwtService.signAsync({ sub: '1', role: 'USER' }, { secret: 'test-refresh' });
    const access = await jwtService.signAsync({ sub: '1', role: 'USER' }, { secret: 'test-access' });
    await expect(service.refresh(refresh)).rejects.toThrow('Sessão encerrada');
    await expect(service.userIdFromAuthorization(`Bearer ${access}`)).rejects.toThrow('Sessão inválida');
  });

  it('rejects inactive user even with correct password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, ativo: false });
    await expect(service.validateCredentials('ana@empresa.com', 'senha123')).rejects.toThrow('Credenciais inválidas');
  });

  it('refresh() rejects invalid refresh token', async () => {
    await expect(service.refresh('invalid.token.string')).rejects.toThrow('Refresh token inválido ou expirado');
  });

  it('refresh() rejects a valid token of a deactivated user', async () => {
    const token = await jwtService.signAsync({ sub: '1', role: 'USER' }, { secret: 'test-refresh' });
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, ativo: false });
    await expect(service.refresh(token)).rejects.toThrow('Sessão encerrada. Entre novamente.');
  });

  it('refresh() reissues an access token for an active user', async () => {
    const token = await jwtService.signAsync({ sub: '1', role: 'USER' }, { secret: 'test-refresh' });
    prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo });
    const { accessToken } = await service.refresh(token);
    expect(await jwtService.verifyAsync(accessToken, { secret: 'test-access' })).toMatchObject({ sub: '1' });
  });

  describe('login com Google', () => {
    async function desafioLogin() {
      const { nonce, browserToken } = await service.createGoogleChallenge('LOGIN');
      googleMock.verifyCredential.mockResolvedValue({ sub: 'google-1', email: 'ana@empresa.com', nonce });
      return browserToken;
    }

    it('emite a sessão do portal com as permissões atuais', async () => {
      permissoesMock.resolveRotinas.mockResolvedValue(['dashboard']);
      const browserToken = await desafioLogin();
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1' });

      const sessao = await service.loginWithGoogle('credencial', browserToken);

      expect(sessao.user).toMatchObject({ id: '1', email: 'ana@empresa.com', rotinas: ['dashboard'] });
      expect(await jwtService.verifyAsync(sessao.accessToken, { secret: 'test-access' })).toMatchObject({ sub: '1' });
    });

    it('recusa credencial inválida sem consumir o desafio', async () => {
      await service.createGoogleChallenge('LOGIN');
      googleMock.verifyCredential.mockRejectedValue(new Error('Credencial do Google inválida ou expirada'));
      await expect(service.loginWithGoogle('credencial', 'qualquer')).rejects.toThrow();
      expect(desafios).toHaveLength(1);
    });

    it('recusa conta sem vínculo, sem criar cadastro', async () => {
      const browserToken = await desafioLogin();
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Conta Google não vinculada');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('recusa usuário inativo', async () => {
      const browserToken = await desafioLogin();
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1', ativo: false });
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Credenciais inválidas');
    });

    it('recusa conta Google vinculada sem acesso à plataforma', async () => {
      const browserToken = await desafioLogin();
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1', acessoPlataforma: false });
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Credenciais inválidas');
    });

    it('recusa desafio de outro navegador', async () => {
      await desafioLogin();
      await expect(service.loginWithGoogle('credencial', 'token-de-outro-navegador')).rejects.toThrow(
        'Desafio de autenticação inválido ou expirado. Tente novamente.',
      );
    });

    it('recusa a reutilização do mesmo desafio', async () => {
      const browserToken = await desafioLogin();
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1' });
      await service.loginWithGoogle('credencial', browserToken);
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow(
        'Desafio de autenticação inválido ou expirado. Tente novamente.',
      );
    });

    it('recusa desafio expirado', async () => {
      const browserToken = await desafioLogin();
      desafios[0].expiraEm = new Date(Date.now() - 1000);
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1' });
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow(
        'Desafio de autenticação inválido ou expirado. Tente novamente.',
      );
    });

    it('recusa desafio emitido para o vínculo', async () => {
      const { nonce, browserToken } = await service.createGoogleChallenge('VINCULO', '1');
      googleMock.verifyCredential.mockResolvedValue({ sub: 'google-1', email: 'ana@empresa.com', nonce });
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow(
        'Desafio de autenticação inválido ou expirado. Tente novamente.',
      );
    });
  });

  describe('cadastro automático por domínio', () => {
    const usuarioCriado = {
      id: '10',
      nome: 'Pessoa Nova',
      email: 'novo@empresa.com',
      role: 'USER',
      senhaHash: '',
      ativo: true, acessoPlataforma: true,
    };

    async function desafioComDominio(email = 'novo@empresa.com', hd = 'empresa.com', sub = 'google-9') {
      const { nonce, browserToken } = await service.createGoogleChallenge('LOGIN');
      googleMock.verifyCredential.mockResolvedValue({ sub, email, nome: 'Pessoa Nova', hd, nonce });
      return browserToken;
    }

    beforeEach(() => {
      googleMock.autoProvisionHabilitado = true;
      googleMock.dominioConfiavel.mockImplementation((hd?: string) => hd === 'empresa.com');
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ ...usuarioCriado, ...data }));
    });

    it('cria a conta ativa, sem senha e sem departamento', async () => {
      const browserToken = await desafioComDominio();

      const sessao = await service.loginWithGoogle('credencial', browserToken);

      const { data } = prismaMock.user.create.mock.calls.at(-1)![0];
      expect(data).toMatchObject({
        email: 'novo@empresa.com',
        nome: 'Pessoa Nova',
        role: 'USER',
        senhaHash: '',
        googleSub: 'google-9',
      });
      expect(data.groupId).toBeUndefined();
      expect(sessao.user).toMatchObject({ email: 'novo@empresa.com', temSenha: false });
    });

    it('vincula ao usuário existente do domínio em vez de duplicar', async () => {
      const browserToken = await desafioComDominio('ana@empresa.com');
      prismaMock.user.findFirst.mockResolvedValue({ ...usuarioAtivo, googleSub: null });
      prismaMock.user.update.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-9' });

      const sessao = await service.loginWithGoogle('credencial', browserToken);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ googleSub: 'google-9' }) }),
      );
      expect(sessao.user).toMatchObject({ id: '1', temSenha: true });
    });

    it('não libera acesso nem vincula pelo domínio um colaborador marcado sem acesso', async () => {
      const browserToken = await desafioComDominio('ana@empresa.com');
      prismaMock.user.findFirst.mockResolvedValue({ ...usuarioAtivo, acessoPlataforma: false });
      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Credenciais inválidas');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('recusa domínio fora da lista, sem criar cadastro', async () => {
      const browserToken = await desafioComDominio('alguem@outra.com', 'outra.com');

      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Conta Google não vinculada');
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('recusa quando o cadastro automático está desligado', async () => {
      googleMock.autoProvisionHabilitado = false;
      const browserToken = await desafioComDominio();

      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Conta Google não vinculada');
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('não revive nem recria usuário desativado', async () => {
      const browserToken = await desafioComDominio('ana@empresa.com');
      prismaMock.user.findFirst.mockResolvedValue({ ...usuarioAtivo, ativo: false });

      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow('Credenciais inválidas');
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('recusa quando o e-mail já pertence a outra conta Google', async () => {
      const browserToken = await desafioComDominio('ana@empresa.com');
      prismaMock.user.findFirst.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1' });

      await expect(service.loginWithGoogle('credencial', browserToken)).rejects.toThrow(
        'Este usuário já possui outra conta Google vinculada.',
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('vínculo da conta Google', () => {
    async function desafioVinculo(email = 'ana@empresa.com', sub = 'google-1') {
      const { nonce, browserToken } = await service.createGoogleChallenge('VINCULO', '1');
      googleMock.verifyCredential.mockResolvedValue({ sub, email, nonce });
      return browserToken;
    }

    it('grava o vínculo após a confirmação da senha', async () => {
      const browserToken = await desafioVinculo();
      prismaMock.user.findUnique.mockImplementation(async ({ where }: any) =>
        where.id ? { ...usuarioAtivo } : null,
      );
      const vinculadoEm = new Date('2026-09-09T12:00:00.000Z');
      prismaMock.user.update.mockResolvedValue({ email: 'ana@empresa.com', googleLinkedAt: vinculadoEm });

      const vinculo = await service.linkGoogle('1', 'credencial', 'senha123', browserToken);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ googleSub: 'google-1' }) }),
      );
      expect(vinculo).toEqual({ email: 'ana@empresa.com', googleLinkedAt: vinculadoEm });
      expect(desafios).toHaveLength(0);
    });

    it('recusa senha incorreta', async () => {
      const browserToken = await desafioVinculo();
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo });
      await expect(service.linkGoogle('1', 'credencial', 'errada', browserToken)).rejects.toThrow(
        'Senha atual incorreta',
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('recusa e-mail diferente do cadastro', async () => {
      const browserToken = await desafioVinculo('outra@gmail.com');
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo });
      await expect(service.linkGoogle('1', 'credencial', 'senha123', browserToken)).rejects.toThrow(
        'A conta Google precisa usar o mesmo e-mail do cadastro.',
      );
    });

    it('recusa conta Google já vinculada a outro usuário', async () => {
      const browserToken = await desafioVinculo();
      prismaMock.user.findUnique.mockImplementation(async ({ where }: any) =>
        where.id ? { ...usuarioAtivo } : { ...usuarioAtivo, id: '2', googleSub: 'google-1' },
      );
      await expect(service.linkGoogle('1', 'credencial', 'senha123', browserToken)).rejects.toThrow(
        'Esta conta Google já está vinculada a outro usuário.',
      );
    });

    it('não substitui um vínculo existente', async () => {
      const browserToken = await desafioVinculo('ana@empresa.com', 'google-2');
      prismaMock.user.findUnique.mockResolvedValue({ ...usuarioAtivo, googleSub: 'google-1' });
      await expect(service.linkGoogle('1', 'credencial', 'senha123', browserToken)).rejects.toThrow(
        'Este usuário já possui outra conta Google vinculada.',
      );
    });

    it('recusa desafio emitido para outro usuário', async () => {
      const { nonce, browserToken } = await service.createGoogleChallenge('VINCULO', '2');
      googleMock.verifyCredential.mockResolvedValue({ sub: 'google-1', email: 'ana@empresa.com', nonce });
      prismaMock.user.findUnique.mockImplementation(async ({ where }: any) => (where.id ? { ...usuarioAtivo } : null));
      await expect(service.linkGoogle('1', 'credencial', 'senha123', browserToken)).rejects.toThrow(
        'Desafio de autenticação inválido ou expirado. Tente novamente.',
      );
    });
  });
});
