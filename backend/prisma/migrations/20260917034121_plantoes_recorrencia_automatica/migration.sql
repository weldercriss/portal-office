-- AlterEnum
ALTER TYPE "PlantaoStatus" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "PlantaoSerie" ALTER COLUMN "dataFim" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TipoPlantao" ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "diasSemana" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AddForeignKey
ALTER TABLE "TipoPlantao" ADD CONSTRAINT "TipoPlantao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
