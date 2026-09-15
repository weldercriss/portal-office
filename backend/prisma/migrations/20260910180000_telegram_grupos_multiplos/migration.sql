-- CreateTable
CREATE TABLE "TelegramGrupoConectado" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL DEFAULT '',
    "nome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramGrupoConectado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGrupoConectado_chatId_topicId_key" ON "TelegramGrupoConectado"("chatId", "topicId");

-- Migra o grupo já conectado (se houver) pra tabela nova, antes de remover as colunas antigas.
INSERT INTO "TelegramGrupoConectado" ("id", "chatId", "topicId", "nome")
SELECT gen_random_uuid(), "grupoChatId", COALESCE("grupoTopicId", ''), "grupoNome"
FROM "TelegramConfig"
WHERE "grupoChatId" IS NOT NULL
ON CONFLICT ("chatId", "topicId") DO NOTHING;

-- AlterTable
ALTER TABLE "TelegramConfig" DROP COLUMN "grupoChatId",
DROP COLUMN "grupoTopicId",
DROP COLUMN "grupoNome";
