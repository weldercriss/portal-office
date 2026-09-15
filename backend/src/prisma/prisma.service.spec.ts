import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and reads back a group', async () => {
    const group = await prisma.group.create({ data: { nome: 'Grupo Teste Prisma' } });
    const found = await prisma.group.findUnique({ where: { id: group.id } });
    expect(found?.nome).toBe('Grupo Teste Prisma');
    await prisma.group.delete({ where: { id: group.id } });
  });
});
