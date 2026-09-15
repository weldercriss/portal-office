-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "responsavelId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "Rotina" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Rotina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupRotina" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "rotinaId" TEXT NOT NULL,

    CONSTRAINT "GroupRotina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRotinaOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rotinaId" TEXT NOT NULL,
    "concedida" BOOLEAN NOT NULL,

    CONSTRAINT "UserRotinaOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rotina_chave_key" ON "Rotina"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "GroupRotina_groupId_rotinaId_key" ON "GroupRotina"("groupId", "rotinaId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRotinaOverride_userId_rotinaId_key" ON "UserRotinaOverride"("userId", "rotinaId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRotina" ADD CONSTRAINT "GroupRotina_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRotina" ADD CONSTRAINT "GroupRotina_rotinaId_fkey" FOREIGN KEY ("rotinaId") REFERENCES "Rotina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRotinaOverride" ADD CONSTRAINT "UserRotinaOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRotinaOverride" ADD CONSTRAINT "UserRotinaOverride_rotinaId_fkey" FOREIGN KEY ("rotinaId") REFERENCES "Rotina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: catálogo fixo de rotinas do sistema
INSERT INTO "Rotina" ("id", "chave", "nome", "ativo") VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', true),
  (gen_random_uuid(), 'plantoes', 'Plantões', true),
  (gen_random_uuid(), 'solicitacoes', 'Solicitações', true),
  (gen_random_uuid(), 'usuarios', 'Usuários', true),
  (gen_random_uuid(), 'departamentos', 'Departamentos', true),
  (gen_random_uuid(), 'permissoes', 'Permissões', true),
  (gen_random_uuid(), 'telegram', 'Integração Telegram', true);

-- Seed: liga todas as rotinas a todos os departamentos existentes, para não travar
-- o acesso de nenhum usuário já cadastrado logo após esta migração (admin ajusta depois).
INSERT INTO "GroupRotina" ("id", "groupId", "rotinaId")
SELECT gen_random_uuid(), g."id", r."id"
FROM "Group" g
CROSS JOIN "Rotina" r;
