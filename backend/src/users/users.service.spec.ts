import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { AlocacoesService } from '../patrimonio/alocacoes.service';
import { PermissoesService } from '../permissoes/permissoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from './dto/create-user.dto';

const ADMIN_CHAMADOR = { id: 'admin1', role: 'ADMIN' };
const MASTER_CHAMADOR = { id: 'master1', role: 'MASTER' };

describe('UsersService', () => {
  let service: UsersService;
  const prismaMock = {
    user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };
  const permissoesMock = { resolveRotinas: jest.fn().mockResolvedValue([]) };
  const alocacoesMock = { devolverTudoDoColaborador: jest.fn().mockResolvedValue({ devolvidas: 0 }) };
  const onboardingMock = { gerarPadrao: jest.fn().mockResolvedValue({ count: 5 }) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PermissoesService, useValue: permissoesMock },
        { provide: AlocacoesService, useValue: alocacoesMock },
        { provide: OnboardingService, useValue: onboardingMock },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('rejects duplicate email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '1' });
    await expect(
      service.create({ nome: 'A', email: 'a@a.com', senha: 'senha123', acessoPlataforma: true, role: UserRole.USER, telegramUsername: '@a_user' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hashes the password before persisting', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: '2', ...data }));
    await service.create({ nome: 'A', email: 'a@a.com', senha: 'senha123', acessoPlataforma: true, role: UserRole.USER, telegramUsername: '@a_user' });
    const dataArg = prismaMock.user.create.mock.calls[0][0].data;
    expect(dataArg.senhaHash).toBeDefined();
    expect(dataArg.senhaHash).not.toBe('senha123');
  });

  it('converts dataNascimento to Date', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: '3', ...data }));
    await service.create({
      nome: 'A',
      email: 'a@a.com',
      senha: 'senha123',
      role: UserRole.USER,
      telegramUsername: '@a_user',
      dataNascimento: '1995-04-12',
    });
    const dataArg = prismaMock.user.create.mock.calls[0][0].data;
    expect(dataArg.dataNascimento).toBeInstanceOf(Date);
  });

  it.each([undefined, false])('creates without password or temporary credential when access is %s', async (acessoPlataforma) => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'sem-acesso', acessoPlataforma: false });
    const result = await service.create({
      nome: 'RH', email: 'rh@example.com', role: UserRole.USER, telegramUsername: '@rh_user',
      acessoPlataforma, senha: 'ignorada123',
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ acessoPlataforma: false, senhaHash: '' }),
    }));
    expect(result.senhaGerada).toBeUndefined();
  });

  it('generates a usable password only when platform access is enabled', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'com-acesso', acessoPlataforma: true });
    const result = await service.create({
      nome: 'RH', email: 'rh@example.com', role: UserRole.USER, telegramUsername: '@rh_user', acessoPlataforma: true,
    });
    expect(result.senhaGerada).toBeTruthy();
    expect(await bcrypt.compare(result.senhaGerada!, prismaMock.user.create.mock.calls[0][0].data.senhaHash)).toBe(true);
  });

  it('removes the password when access is revoked, keeping the collaborator active', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '1', ativo: true, acessoPlataforma: true, senhaHash: 'old-hash' });
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
    prismaMock.user.update.mockResolvedValue({ id: '1', ativo: true, acessoPlataforma: false });
    const result = await service.update('1', { acessoPlataforma: false }, ADMIN_CHAMADOR);
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ acessoPlataforma: false, senhaHash: '' });
    expect(data).not.toHaveProperty('ativo');
    expect(result.senhaGerada).toBeUndefined();
  });

  it.each([undefined, 'definida123'])('creates credentials when granting access later (password: %s)', async (senha) => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '1', ativo: true, acessoPlataforma: false, senhaHash: '' });
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
    prismaMock.user.update.mockResolvedValue({ id: '1', acessoPlataforma: true });
    const result = await service.update('1', { acessoPlataforma: true, senha }, ADMIN_CHAMADOR);
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('senha');
    expect(await bcrypt.compare(senha ?? result.senhaGerada!, data.senhaHash)).toBe(true);
    if (senha) expect(result.senhaGerada).toBeUndefined();
  });

  it('keeps credentials on unrelated edits and does not generate another password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '1', acessoPlataforma: true, senhaHash: 'existing' });
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
    prismaMock.user.update.mockResolvedValue({ id: '1', acessoPlataforma: true });
    const result = await service.update('1', { nome: 'Outro nome', acessoPlataforma: true }, ADMIN_CHAMADOR);
    expect(prismaMock.user.update.mock.calls[0][0].data.senhaHash).toBeUndefined();
    expect(result.senhaGerada).toBeUndefined();
  });

  it('does not let an account without access define its own password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '1', ativo: true, acessoPlataforma: false, senhaHash: '' });
    await expect(service.changePassword('1', { novaSenha: 'nova123' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('converts dataAdmissao to Date on update', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '4b' });
    const tx = {
      user: { update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: '4b', ...data })) },
    };
    prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
    await service.update('4b', { dataAdmissao: '2022-03-01' }, ADMIN_CHAMADOR);
    const dataArg = tx.user.update.mock.calls[0][0].data;
    expect(dataArg.dataAdmissao).toBeInstanceOf(Date);
  });

  it('devolve equipamentos e gera o checklist de desligamento só na virada pra DESLIGADO', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '6', statusColaborador: 'ATIVO' });
    const tx = { user: { update: jest.fn().mockResolvedValue({ id: '6' }) } };
    prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.update('6', { statusColaborador: 'DESLIGADO' as any }, ADMIN_CHAMADOR);

    expect(alocacoesMock.devolverTudoDoColaborador).toHaveBeenCalledWith('6');
    expect(onboardingMock.gerarPadrao).toHaveBeenCalledWith('6', 'DESLIGAMENTO');
  });

  it('não repete devolução nem checklist ao salvar de novo quem já estava desligado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '7', statusColaborador: 'DESLIGADO' });
    const tx = { user: { update: jest.fn().mockResolvedValue({ id: '7' }) } };
    prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.update('7', { statusColaborador: 'DESLIGADO' as any }, ADMIN_CHAMADOR);

    expect(alocacoesMock.devolverTudoDoColaborador).not.toHaveBeenCalled();
    expect(onboardingMock.gerarPadrao).not.toHaveBeenCalled();
  });

  it('soft-deletes on remove (ativo=false)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '5' });
    prismaMock.user.update.mockResolvedValue({ id: '5', ativo: false });
    await service.remove('5', ADMIN_CHAMADOR);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '5' }, data: { ativo: false } }),
    );
  });

  it('changes the own password after validating the current password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '6', ativo: true, acessoPlataforma: true, senhaHash: await bcrypt.hash('atual123', 10) });
    prismaMock.user.update.mockResolvedValue({ id: '6' });

    await service.changePassword('6', { senhaAtual: 'atual123', novaSenha: 'nova123' });

    const dataArg = prismaMock.user.update.mock.calls[0][0].data;
    expect(dataArg.senhaHash).toBeDefined();
    expect(await bcrypt.compare('nova123', dataArg.senhaHash)).toBe(true);
  });

  it('rejects an invalid current password without updating', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '7', ativo: true, acessoPlataforma: true, senhaHash: await bcrypt.hash('atual123', 10) });

    await expect(service.changePassword('7', { senhaAtual: 'errada', novaSenha: 'nova123' })).rejects.toThrow(
      'Senha atual inválida',
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('defines the first password without asking for the current one', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '8', ativo: true, acessoPlataforma: true, senhaHash: '' });
    prismaMock.user.update.mockResolvedValue({ id: '8' });

    await service.changePassword('8', { novaSenha: 'nova123' });

    const dataArg = prismaMock.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('nova123', dataArg.senhaHash)).toBe(true);
  });

  it('still requires the current password when one exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '9', ativo: true, acessoPlataforma: true, senhaHash: await bcrypt.hash('atual123', 10) });

    await expect(service.changePassword('9', { novaSenha: 'nova123' })).rejects.toThrow('Senha atual inválida');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFound when finding a missing user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope', ADMIN_CHAMADOR)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('permanently deletes an inactive user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: '8', ativo: false });
    prismaMock.user.delete.mockResolvedValue({ id: '8' });

    await expect(service.deletePermanently('8', ADMIN_CHAMADOR)).resolves.toEqual({ success: true });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: '8' } });
  });

  describe('master', () => {
    it('excludes MASTER from the colaboradores listing for a non-master caller', () => {
      service.findAll(ADMIN_CHAMADOR);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: { not: 'MASTER' } } }),
      );
    });

    it('lists everyone, masters included, when the caller is master', () => {
      service.findAll(MASTER_CHAMADOR);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });

    it('hides a master user from findOne/update/remove/deletePermanently when the caller is not master (same 404 as a missing id)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'm1', role: 'MASTER' });
      await expect(service.findOne('m1', ADMIN_CHAMADOR)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.update('m1', {}, ADMIN_CHAMADOR)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove('m1', ADMIN_CHAMADOR)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.deletePermanently('m1', ADMIN_CHAMADOR)).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('lets a master manage another master normally', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'm1', role: 'MASTER' });
      prismaMock.user.update.mockResolvedValue({ id: 'm1', ativo: false });
      await expect(service.remove('m1', MASTER_CHAMADOR)).resolves.toEqual({ id: 'm1', ativo: false });
    });

    it('lists only master users in findMasters', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'm1', role: 'MASTER' }]);
      await expect(service.findMasters()).resolves.toEqual([{ id: 'm1', role: 'MASTER' }]);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'MASTER' } }));
    });

    it('creates a master user with a hashed password, no colaborador fields required', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'novo-master', ...data }));

      const criado = await service.createMaster({ nome: 'Novo Master', email: 'novo@suri.ai', senha: 'senha123456' });

      const dataArg = prismaMock.user.create.mock.calls[0][0].data;
      expect(dataArg).toMatchObject({ nome: 'Novo Master', email: 'novo@suri.ai', role: 'MASTER', ativo: true, acessoPlataforma: true });
      expect(dataArg.senhaHash).not.toBe('senha123456');
      expect(await bcrypt.compare('senha123456', dataArg.senhaHash)).toBe(true);
      expect(criado.role).toBe('MASTER');
    });

    it('rejects creating a master with an e-mail already in use', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existente' });
      await expect(
        service.createMaster({ nome: 'Dup', email: 'ja@suri.ai', senha: 'senha123456' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
