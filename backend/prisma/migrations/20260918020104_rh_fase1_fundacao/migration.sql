-- AlterTable
ALTER TABLE "HistoricoProfissional" ADD COLUMN     "empresa" TEXT,
ADD COLUMN     "externo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alergias" TEXT,
ADD COLUMN     "beneficioCultural" TEXT,
ADD COLUMN     "condicoesSaude" TEXT,
ADD COLUMN     "dataDesligamento" TIMESTAMP(3),
ADD COLUMN     "motivoDesligamento" TEXT,
ADD COLUMN     "tipoSanguineo" TEXT;
