import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubAreasService } from './subareas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubAreasService', () => {
  let service: SubAreasService;
  const prismaMock = {
    subArea: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [SubAreasService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(SubAreasService);
  });

  it('throws when updating a missing sub-área', async () => {
    prismaMock.subArea.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { nome: 'Nova' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only active sub-áreas by default', () => {
    prismaMock.subArea.findMany.mockResolvedValue([]);
    service.findAll();
    expect(prismaMock.subArea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ativo: true } }),
    );
  });

  it('filters by groupId when informed', () => {
    prismaMock.subArea.findMany.mockResolvedValue([]);
    service.findAll('grupo-1');
    expect(prismaMock.subArea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ativo: true, groupId: 'grupo-1' } }),
    );
  });

  it('soft-deletes on remove (ativo=false)', async () => {
    prismaMock.subArea.findUnique.mockResolvedValue({ id: '1' });
    prismaMock.subArea.update.mockResolvedValue({ id: '1', ativo: false });
    await service.remove('1');
    expect(prismaMock.subArea.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { ativo: false } });
  });

  it('throws when removing a missing sub-área', async () => {
    prismaMock.subArea.findUnique.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a sub-área without linked users', async () => {
    prismaMock.subArea.findUnique.mockResolvedValue({ id: '2', _count: { users: 0 } });
    prismaMock.subArea.delete.mockResolvedValue({ id: '2' });
    await expect(service.deletePermanently('2')).resolves.toEqual({ success: true });
  });

  it('rejects deleting a sub-área with linked users', async () => {
    prismaMock.subArea.findUnique.mockResolvedValue({ id: '3', _count: { users: 1 } });
    await expect(service.deletePermanently('3')).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.subArea.delete).not.toHaveBeenCalled();
  });
});
