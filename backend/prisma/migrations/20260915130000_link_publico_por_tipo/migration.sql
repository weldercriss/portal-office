-- DropIndex
DROP INDEX "Solicitacao_tokenLinkPublico_key";

-- AlterTable
ALTER TABLE "Solicitacao" DROP COLUMN "tokenLinkPublico";
ALTER TABLE "Solicitacao" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Solicitacao" ALTER COLUMN "registradoPorId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Solicitacao" DROP CONSTRAINT "Solicitacao_registradoPorId_fkey";

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TipoSolicitacao" DROP COLUMN "prazoLinkPublicoHoras",
ADD COLUMN "tokenLinkPublico" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TipoSolicitacao_tokenLinkPublico_key" ON "TipoSolicitacao"("tokenLinkPublico");
