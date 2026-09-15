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
});
