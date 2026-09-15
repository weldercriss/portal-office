-- AlterTable: horaInicio/horaFim passam a viver no TipoPlantao (nullable até o backfill)
ALTER TABLE "TipoPlantao" ADD COLUMN "horaInicio" TEXT;
ALTER TABLE "TipoPlantao" ADD COLUMN "horaFim" TEXT;

-- Backfill a partir do turno usado em algum plantão já vinculado a este tipo
UPDATE "TipoPlantao" tp
SET "horaInicio" = t."horaInicio", "horaFim" = t."horaFim"
FROM "Plantao" p
JOIN "Turno" t ON t.id = p."turnoId"
WHERE p."tipoPlantaoId" = tp.id
  AND tp."horaInicio" IS NULL;

-- Tipos sem nenhum plantão/turno vinculado ficam com um horário neutro de dia inteiro
UPDATE "TipoPlantao" SET "horaInicio" = '00:00', "horaFim" = '23:59' WHERE "horaInicio" IS NULL;

ALTER TABLE "TipoPlantao" ALTER COLUMN "horaInicio" SET NOT NULL;
ALTER TABLE "TipoPlantao" ALTER COLUMN "horaFim" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Plantao" DROP CONSTRAINT "Plantao_turnoId_fkey";

-- AlterTable
ALTER TABLE "Plantao" DROP COLUMN "turnoId";

-- DropTable
DROP TABLE "Turno";
