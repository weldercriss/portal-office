import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWithUser(role?: string): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows when no roles required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithUser('USER'))).toBe(true);
  });

  it('blocks user without required role', () => {
    const reflector = { getAllAndOverride: () => ['ADMIN'] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextWithUser('USER'))).toThrow(
      'Acesso restrito ao administrador',
    );
  });

  it('allows user with required role', () => {
    const reflector = { getAllAndOverride: () => ['ADMIN'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithUser('ADMIN'))).toBe(true);
  });

  it('allows MASTER through an ADMIN-only route (hierarquia)', () => {
    const reflector = { getAllAndOverride: () => ['ADMIN'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithUser('MASTER'))).toBe(true);
  });

  it('blocks ADMIN from a MASTER-only route (hierarquia não é bidirecional)', () => {
    const reflector = { getAllAndOverride: () => ['MASTER'] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextWithUser('ADMIN'))).toThrow(
      'Acesso restrito ao administrador',
    );
  });

  it('allows MASTER on a MASTER-only route', () => {
    const reflector = { getAllAndOverride: () => ['MASTER'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWithUser('MASTER'))).toBe(true);
  });
});
