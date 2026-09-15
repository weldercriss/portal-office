-- CreateEnum
CREATE TYPE "AgendaGoogleConexaoStatus" AS ENUM ('CONECTADA', 'RECONECTAR', 'DESCONECTADA');

-- CreateTable
CREATE TABLE "AgendaGoogleConexao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleSub" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "refreshTokenCriptografado" TEXT,
    "escopos" TEXT NOT NULL DEFAULT '',
    "status" "AgendaGoogleConexaoStatus" NOT NULL DEFAULT 'CONECTADA',
    "ultimoErro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaGoogleConexao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaGoogleOAuthTentativa" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaGoogleOAuthTentativa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgendaGoogleConexao_userId_key" ON "AgendaGoogleConexao"("userId");

-- CreateIndex
CREATE INDEX "AgendaGoogleConexao_status_idx" ON "AgendaGoogleConexao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaGoogleOAuthTentativa_stateHash_key" ON "AgendaGoogleOAuthTentativa"("stateHash");

-- CreateIndex
CREATE INDEX "AgendaGoogleOAuthTentativa_expiraEm_idx" ON "AgendaGoogleOAuthTentativa"("expiraEm");

-- AddForeignKey
ALTER TABLE "AgendaGoogleConexao" ADD CONSTRAINT "AgendaGoogleConexao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "PlantaoEventoAgenda" ADD COLUMN     "googleSub" TEXT;

-- AlterTable
ALTER TABLE "AgendaSyncPendente" ADD COLUMN     "aguardandoReconexaoUserId" TEXT;

-- CreateIndex
CREATE INDEX "PlantaoEventoAgenda_userId_idx" ON "PlantaoEventoAgenda"("userId");

-- CreateIndex
CREATE INDEX "AgendaSyncPendente_aguardandoReconexaoUserId_idx" ON "AgendaSyncPendente"("aguardandoReconexaoUserId");
