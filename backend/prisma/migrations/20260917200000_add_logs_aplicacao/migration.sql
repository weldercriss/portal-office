-- CreateEnum
CREATE TYPE "LogAplicacaoResultado" AS ENUM ('SUCESSO', 'ERRO_CLIENTE', 'ERRO_SERVIDOR', 'ABORTADA');

-- CreateTable
CREATE TABLE "LogAplicacao" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ciclo" INTEGER NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "resultado" "LogAplicacaoResultado" NOT NULL,
    "metodo" TEXT NOT NULL,
    "rota" TEXT NOT NULL,
    "statusHttp" INTEGER NOT NULL,
    "duracaoMs" INTEGER NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL,
    "finalizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT,
    "usuarioEmail" TEXT,
    "ipOrigem" TEXT,
    "userAgent" TEXT,
    "erroClasse" TEXT,
    "erroMensagem" TEXT,
    "erroStack" TEXT,
    "erroDetalhes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAplicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAplicacaoControle" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ciclo" INTEGER NOT NULL DEFAULT 1,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogAplicacaoControle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LogAplicacao_requestId_key" ON "LogAplicacao"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "LogAplicacao_ciclo_sequencia_key" ON "LogAplicacao"("ciclo", "sequencia");

-- CreateIndex
CREATE INDEX "LogAplicacao_finalizadoEm_idx" ON "LogAplicacao"("finalizadoEm");

-- CreateIndex
CREATE INDEX "LogAplicacao_resultado_idx" ON "LogAplicacao"("resultado");

-- CreateIndex
CREATE INDEX "LogAplicacao_statusHttp_idx" ON "LogAplicacao"("statusHttp");

-- CreateIndex
CREATE INDEX "LogAplicacao_usuarioId_idx" ON "LogAplicacao"("usuarioId");

-- AddForeignKey
ALTER TABLE "LogAplicacao" ADD CONSTRAINT "LogAplicacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
