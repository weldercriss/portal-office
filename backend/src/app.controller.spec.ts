import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('AppController', () => {
  let controller: AppController;
  const query = jest.fn();

  beforeEach(async () => {
    query.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: query } }],
    }).compile();
    controller = moduleRef.get(AppController);
  });

  it('returns ok status', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('reports readiness after checking the database', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);
    await expect(controller.readiness()).resolves.toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalled();
  });

  it('returns 503 when the database fails', async () => {
    query.mockRejectedValue(new Error('database credentials must not be exposed'));
    await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
  });
});
