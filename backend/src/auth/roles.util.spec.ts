import { ehAdminOuSuperior, satisfazRole } from './roles.util';

describe('roles.util', () => {
  describe('satisfazRole', () => {
    it.each([
      ['USER', 'USER', true],
      ['ADMIN', 'USER', true],
      ['MASTER', 'USER', true],
      ['USER', 'ADMIN', false],
      ['ADMIN', 'ADMIN', true],
      ['MASTER', 'ADMIN', true],
      ['USER', 'MASTER', false],
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
    it('true para ADMIN e MASTER, false para USER', () => {
      expect(ehAdminOuSuperior('ADMIN')).toBe(true);
      expect(ehAdminOuSuperior('MASTER')).toBe(true);
      expect(ehAdminOuSuperior('USER')).toBe(false);
      expect(ehAdminOuSuperior(undefined)).toBe(false);
    });
  });
});
