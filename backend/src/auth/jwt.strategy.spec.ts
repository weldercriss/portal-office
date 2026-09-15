import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy platform access', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access';
    strategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  it.each([null, { ativo: false, acessoPlataforma: true }, { ativo: true, acessoPlataforma: false }])(
    'rejects a previously issued token for a blocked user: %s', async (user) => {
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(strategy.validate({ sub: '1', role: 'ADMIN' })).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('allows users with access and uses their current role', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '1', role: 'USER', ativo: true, acessoPlataforma: true });
    await expect(strategy.validate({ sub: '1', role: 'ADMIN' })).resolves.toEqual({ id: '1', role: 'USER' });
  });
});
