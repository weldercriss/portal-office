-- CreateEnum
CREATE TYPE "PlantaoStatus" AS ENUM ('RASCUNHO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "PlantaoAceite" AS ENUM ('PENDENTE', 'ACEITO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TrocaStatus" AS ENUM ('PENDENTE', 'ACEITA', 'REJEITADA');

-- CreateTable
CREATE TABLE "Plantao" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "status" "PlantaoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "aceite" "PlantaoAceite" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaPlantao" (
    "id" TEXT NOT NULL,
    "plantaoOrigemId" TEXT NOT NULL,
    "plantaoDestinoId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "status" "TrocaStatus" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidoEm" TIMESTAMP(3),

    CONSTRAINT "TrocaPlantao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Plantao" ADD CONSTRAINT "Plantao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plantao" ADD CONSTRAINT "Plantao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaPlantao" ADD CONSTRAINT "TrocaPlantao_plantaoOrigemId_fkey" FOREIGN KEY ("plantaoOrigemId") REFERENCES "Plantao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaPlantao" ADD CONSTRAINT "TrocaPlantao_plantaoDestinoId_fkey" FOREIGN KEY ("plantaoDestinoId") REFERENCES "Plantao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaPlantao" ADD CONSTRAINT "TrocaPlantao_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaPlantao" ADD CONSTRAINT "TrocaPlantao_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
