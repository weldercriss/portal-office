import { ehAdminOuSuperior, ehGestorOuSuperior, satisfazRole } from './roles.util';

describe('roles.util', () => {
  describe('satisfazRole', () => {
    it.each([
      ['USER', 'USER', true],
      ['GESTOR', 'USER', true],
      ['ADMIN', 'USER', true],
      ['MASTER', 'USER', true],
      ['USER', 'GESTOR', false],
      ['GESTOR', 'GESTOR', true],
      ['ADMIN', 'GESTOR', true],
      ['MASTER', 'GESTOR', true],
      ['USER', 'ADMIN', false],
      ['GESTOR', 'ADMIN', false],
      ['ADMIN', 'ADMIN', true],
      ['MASTER', 'ADMIN', true],
      ['USER', 'MASTER', false],
      ['GESTOR', 'MASTER', false],
      ['ADMIN', 'MASTER', false],
      ['MASTER', 'MASTER', true],
    ] as const)('role %s satisfaz mínimo %s? %s', (role, minimo, esperado) => {
      expect(satisfazRole(role, minimo)).toBe(esperado);
    });

    it('nega para role ausente ou desconhecido', () => {
      expect(satisfazRole(undefined, 'USER')).toBe(false);
      expect(satisfazRole(null, 'USER')).toBe(false);
      expect(satisfazRole('QUALQUER_COISA', 'USER')).toBe(false);
    });
  });

  describe('ehAdminOuSuperior', () => {
    it('true para ADMIN e MASTER, false para GESTOR e USER', () => {
      expect(ehAdminOuSuperior('ADMIN')).toBe(true);
      expect(ehAdminOuSuperior('MASTER')).toBe(true);
      expect(ehAdminOuSuperior('GESTOR')).toBe(false);
      expect(ehAdminOuSuperior('USER')).toBe(false);
      expect(ehAdminOuSuperior(undefined)).toBe(false);
    });
  });

  describe('ehGestorOuSuperior', () => {
    it('true para GESTOR, ADMIN e MASTER, false para USER', () => {
      expect(ehGestorOuSuperior('GESTOR')).toBe(true);
      expect(ehGestorOuSuperior('ADMIN')).toBe(true);
      expect(ehGestorOuSuperior('MASTER')).toBe(true);
      expect(ehGestorOuSuperior('USER')).toBe(false);
      expect(ehGestorOuSuperior(undefined)).toBe(false);
    });
  });
});
