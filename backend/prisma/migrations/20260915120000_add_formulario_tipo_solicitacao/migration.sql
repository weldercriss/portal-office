-- AlterTable
ALTER TABLE "TipoSolicitacao" ADD COLUMN "usaFormulario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "camposFormulario" JSONB,
ADD COLUMN "permiteLinkPublico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "prazoLinkPublicoHoras" INTEGER;

-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN "respostasFormulario" JSONB,
ADD COLUMN "tokenLinkPublico" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacao_tokenLinkPublico_key" ON "Solicitacao"("tokenLinkPublico");

-- CreateTable
CREATE TABLE "TemplateFormulario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "campos" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateFormulario_pkey" PRIMARY KEY ("id")
);
