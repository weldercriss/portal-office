-- CreateEnum
CREATE TYPE "RegraRecorrenciaPlantao" AS ENUM ('UNICO', 'SEMANAL', 'MENSAL');

-- AlterTable
ALTER TABLE "Plantao" ADD COLUMN     "serieId" TEXT,
ADD COLUMN     "tipoPlantaoId" TEXT,
ADD COLUMN     "turnoId" TEXT;

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoPlantao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "regra" "RegraRecorrenciaPlantao" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoPlantao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantaoSerie" (
    "id" TEXT NOT NULL,
    "tipoPlantaoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "diasSemana" INTEGER[],
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantaoSerie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlantaoSerie" ADD CONSTRAINT "PlantaoSerie_tipoPlantaoId_fkey" FOREIGN KEY ("tipoPlantaoId") REFERENCES "TipoPlantao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantaoSerie" ADD CONSTRAINT "PlantaoSerie_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plantao" ADD CONSTRAINT "Plantao_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plantao" ADD CONSTRAINT "Plantao_tipoPlantaoId_fkey" FOREIGN KEY ("tipoPlantaoId") REFERENCES "TipoPlantao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plantao" ADD CONSTRAINT "Plantao_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "PlantaoSerie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

