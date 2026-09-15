-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agendaGoogleAtiva" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PlantaoEventoAgenda" (
    "id" TEXT NOT NULL,
    "plantaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usuarioEmail" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantaoEventoAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaSyncPendente" (
    "id" TEXT NOT NULL,
    "plantaoId" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proximaTentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoErro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaSyncPendente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantaoEventoAgenda_plantaoId_idx" ON "PlantaoEventoAgenda"("plantaoId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantaoEventoAgenda_plantaoId_userId_key" ON "PlantaoEventoAgenda"("plantaoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaSyncPendente_plantaoId_key" ON "AgendaSyncPendente"("plantaoId");

-- CreateIndex
CREATE INDEX "AgendaSyncPendente_proximaTentativa_idx" ON "AgendaSyncPendente"("proximaTentativa");
