import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GroupsService', () => {
  let service: GroupsService;
  const prismaMock = { group: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn(), delete: jest.fn() } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [GroupsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(GroupsService);
  });

  it('throws when updating a missing group', async () => {
    prismaMock.group.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { nome: 'Novo' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only active groups', () => {
    prismaMock.group.findMany.mockResolvedValue([]);
    service.findAll();
    expect(prismaMock.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ativo: true } }),
    );
  });

  it('soft-deletes on remove (ativo=false)', async () => {
    prismaMock.group.findUnique.mockResolvedValue({ id: '1' });
    prismaMock.group.update.mockResolvedValue({ id: '1', ativo: false });
    await service.remove('1');
    expect(prismaMock.group.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { ativo: false } });
  });

  it('throws when removing a missing group', async () => {
    prismaMock.group.findUnique.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a department without linked users', async () => {
    prismaMock.group.findUnique.mockResolvedValue({ id: '2', _count: { users: 0 } });
    prismaMock.group.delete.mockResolvedValue({ id: '2' });
    await expect(service.deletePermanently('2')).resolves.toEqual({ success: true });
  });

  it('rejects deleting a department with linked users', async () => {
    prismaMock.group.findUnique.mockResolvedValue({ id: '3', _count: { users: 1 } });
    await expect(service.deletePermanently('3')).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.group.delete).not.toHaveBeenCalled();
  });
});
