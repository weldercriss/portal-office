import { Injectable } from '@nestjs/common';
import { ehAdminOuSuperior } from '../auth/roles.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissoesService {
  constructor(private readonly prisma: PrismaService) {}

  listRotinas() {
    return this.prisma.rotina.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  }

  async resolveRotinas(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    if (ehAdminOuSuperior(user.role)) {
      const todas = await this.prisma.rotina.findMany({ where: { ativo: true }, select: { chave: true } });
      return todas.map((r) => r.chave);
    }

    const [doGrupo, overrides] = await Promise.all([
      user.groupId
        ? this.prisma.groupRotina.findMany({
            where: { groupId: user.groupId, rotina: { ativo: true } },
            select: { rotina: { select: { chave: true } } },
          })
        : Promise.resolve([]),
      this.prisma.userRotinaOverride.findMany({
        where: { userId, rotina: { ativo: true } },
        select: { concedida: true, rotina: { select: { chave: true } } },
      }),
    ]);

    const resolvidas = new Set(doGrupo.map((g) => g.rotina.chave));
    for (const override of overrides) {
      if (override.concedida) resolvidas.add(override.rotina.chave);
      else resolvidas.delete(override.rotina.chave);
    }
    return [...resolvidas];
  }

  getGroupRotinas(groupId: string) {
    return this.prisma.groupRotina
      .findMany({ where: { groupId }, select: { rotina: { select: { chave: true, nome: true } } } })
      .then((rows) => rows.map((r) => r.rotina));
  }

  async setGroupRotinas(groupId: string, chaves: string[]) {
    const rotinas = await this.prisma.rotina.findMany({ where: { chave: { in: chaves } } });
    await this.prisma.$transaction([
      this.prisma.groupRotina.deleteMany({ where: { groupId } }),
      this.prisma.groupRotina.createMany({ data: rotinas.map((r) => ({ groupId, rotinaId: r.id })) }),
    ]);
    return this.getGroupRotinas(groupId);
  }

  getUserOverrides(userId: string) {
    return this.prisma.userRotinaOverride.findMany({
      where: { userId },
      select: { concedida: true, rotina: { select: { chave: true, nome: true } } },
    });
  }

  async setUserOverride(userId: string, chave: string, concedida: boolean | null) {
    const rotina = await this.prisma.rotina.findUniqueOrThrow({ where: { chave } });
    if (concedida === null) {
      await this.prisma.userRotinaOverride.deleteMany({ where: { userId, rotinaId: rotina.id } });
      return { removido: true };
    }
    return this.prisma.userRotinaOverride.upsert({
      where: { userId_rotinaId: { userId, rotinaId: rotina.id } },
      update: { concedida },
      create: { userId, rotinaId: rotina.id, concedida },
    });
  }
}
