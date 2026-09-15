-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEG', 'TER', 'QUA', 'QUI', 'SEX');

-- CreateEnum
CREATE TYPE "TipoMarcacao" AS ENUM ('ENTRADA', 'SAIDA');

-- DropForeignKey
ALTER TABLE "StatusHistory" DROP CONSTRAINT "StatusHistory_statusTypeId_fkey";

-- DropForeignKey
ALTER TABLE "StatusHistory" DROP CONSTRAINT "StatusHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "StatusType" DROP CONSTRAINT "StatusType_criadoPor_fkey";

-- DropForeignKey
ALTER TABLE "UserStatus" DROP CONSTRAINT "UserStatus_statusTypeId_fkey";

-- DropForeignKey
ALTER TABLE "UserStatus" DROP CONSTRAINT "UserStatus_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "horaEntradaPadrao" TEXT,
ADD COLUMN     "horaSaidaPadrao" TEXT,
ADD COLUMN     "horarioAlmocoFim" TEXT,
ADD COLUMN     "horarioAlmocoInicio" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "telegramUsername" TEXT;

-- DropTable
DROP TABLE "StatusHistory";

-- DropTable
DROP TABLE "StatusType";

-- DropTable
DROP TABLE "UserStatus";

-- CreateTable
CREATE TABLE "HorarioExcecao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "tipo" "TipoMarcacao" NOT NULL,
    "hora" TEXT NOT NULL,

    CONSTRAINT "HorarioExcecao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HorarioExcecao" ADD CONSTRAINT "HorarioExcecao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

