-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "lembreteFim30MinEnviado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TelegramConfig" ADD COLUMN     "grupoChatId" TEXT,
ADD COLUMN     "grupoNome" TEXT,
ADD COLUMN     "grupoTopicId" TEXT;

-- AlterTable
ALTER TABLE "TelegramNotificacaoTipo" ADD COLUMN     "enviarGrupo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TelegramGrupoDetectado" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "chatTitle" TEXT,
    "topicId" TEXT NOT NULL DEFAULT '',
    "vistoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGrupoDetectado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGrupoDetectado_chatId_topicId_key" ON "TelegramGrupoDetectado"("chatId", "topicId");
