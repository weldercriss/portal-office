-- CreateEnum
CREATE TYPE "PesquisaTipo" AS ENUM ('NPS', 'NR1', 'FEEDBACK_1_1', 'GERAL');

-- CreateTable
CREATE TABLE "Pesquisa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "PesquisaTipo" NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "campos" JSONB NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pesquisa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PesquisaConvite" (
    "id" TEXT NOT NULL,
    "pesquisaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "convidadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondeuEm" TIMESTAMP(3),

    CONSTRAINT "PesquisaConvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PesquisaResposta" (
    "id" TEXT NOT NULL,
    "pesquisaId" TEXT NOT NULL,
    "respostas" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PesquisaResposta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PesquisaConvite_pesquisaId_idx" ON "PesquisaConvite"("pesquisaId");

-- CreateIndex
CREATE INDEX "PesquisaConvite_userId_idx" ON "PesquisaConvite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PesquisaConvite_pesquisaId_userId_key" ON "PesquisaConvite"("pesquisaId", "userId");

-- CreateIndex
CREATE INDEX "PesquisaResposta_pesquisaId_idx" ON "PesquisaResposta"("pesquisaId");

-- AddForeignKey
ALTER TABLE "Pesquisa" ADD CONSTRAINT "Pesquisa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PesquisaConvite" ADD CONSTRAINT "PesquisaConvite_pesquisaId_fkey" FOREIGN KEY ("pesquisaId") REFERENCES "Pesquisa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PesquisaConvite" ADD CONSTRAINT "PesquisaConvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PesquisaResposta" ADD CONSTRAINT "PesquisaResposta_pesquisaId_fkey" FOREIGN KEY ("pesquisaId") REFERENCES "Pesquisa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
