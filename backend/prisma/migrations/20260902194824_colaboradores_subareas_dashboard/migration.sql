-- AlterTable
ALTER TABLE "Plantao" DROP COLUMN "aceite";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dataAdmissao" TIMESTAMP(3),
ADD COLUMN     "recebeAvisosRH" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senioridade" TEXT,
ADD COLUMN     "subAreaId" TEXT;

-- DropEnum
DROP TYPE "PlantaoAceite";

-- CreateTable
CREATE TABLE "SubArea" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "SubArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubArea_groupId_nome_key" ON "SubArea"("groupId", "nome");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subAreaId_fkey" FOREIGN KEY ("subAreaId") REFERENCES "SubArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubArea" ADD CONSTRAINT "SubArea_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove tipo de notificação do fluxo de aceite de plantão, descontinuado nesta migração
DELETE FROM "TelegramNotificacaoTipo" WHERE "tipo" = 'PLANTAO_REJEITADO';

-- Seed: novos tipos de notificação de aniversário/tempo de casa (começam desligados no Telegram)
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar") VALUES
  (gen_random_uuid(), 'ANIVERSARIO_PROXIMO', 'Aniversário de colaborador próximo', false),
  (gen_random_uuid(), 'ANIVERSARIO_ADMISSAO_PROXIMO', 'Aniversário de tempo de casa próximo', false);
