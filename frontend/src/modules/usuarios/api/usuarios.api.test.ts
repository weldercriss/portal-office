import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../api/httpClient';
import {
  createUsuario,
  changeMinhaSenha,
  deactivateUsuario,
  getMeuPerfil,
  getUsuario,
  getUsuarios,
  updateUsuario,
} from './usuarios.api';

vi.mock('../../../api/httpClient', () => ({ httpClient: vi.fn().mockResolvedValue({}) }));

const httpClientMock = vi.mocked(httpClient);

describe('usuarios.api', () => {
  beforeEach(() => {
    httpClientMock.mockClear();
  });

  it('lists users from /users', () => {
    getUsuarios();
    expect(httpClientMock).toHaveBeenCalledWith('/users');
  });

  it('fetches a single user by id', () => {
    getUsuario('abc');
    expect(httpClientMock).toHaveBeenCalledWith('/users/abc');
  });

  it('fetches the current profile from /users/me', () => {
    getMeuPerfil();
    expect(httpClientMock).toHaveBeenCalledWith('/users/me');
  });

  it('creates a user with POST', () => {
    const input = { nome: 'A', email: 'a@a.com', senha: 'senha123', role: 'USER' as const, telegramUsername: '@a_user' };
    createUsuario(input);
    expect(httpClientMock).toHaveBeenCalledWith('/users', { method: 'POST', body: input });
  });

  it('updates a user with PATCH', () => {
    updateUsuario('abc', { nome: 'Novo' });
    expect(httpClientMock).toHaveBeenCalledWith('/users/abc', { method: 'PATCH', body: { nome: 'Novo' } });
  });

  it('deactivates a user with DELETE', () => {
    deactivateUsuario('abc');
    expect(httpClientMock).toHaveBeenCalledWith('/users/abc', { method: 'DELETE' });
  });

  it('changes my password with PATCH', () => {
    const input = { senhaAtual: 'atual123', novaSenha: 'nova123' };
    changeMinhaSenha(input);
    expect(httpClientMock).toHaveBeenCalledWith('/users/me/password', { method: 'PATCH', body: input });
  });
});
