-- CreateEnum
CREATE TYPE "SolicitacaoStatus" AS ENUM ('SOLICITADA', 'APROVADA', 'REJEITADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "TipoSolicitacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "requerAprovacao" BOOLEAN NOT NULL DEFAULT true,
    "contaComoAfastamento" BOOLEAN NOT NULL DEFAULT true,
    "ehFolga" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoSolicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "descricao" TEXT,
    "status" "SolicitacaoStatus" NOT NULL DEFAULT 'SOLICITADA',
    "decididoPorId" TEXT,
    "decididoEm" TIMESTAMP(3),
    "registradoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoSolicitacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: catálogo padrão de tipos de solicitação (o admin pode criar outros depois)
INSERT INTO "TipoSolicitacao" ("id", "nome", "ativo", "requerAprovacao", "contaComoAfastamento", "ehFolga") VALUES
  (gen_random_uuid(), 'Férias', true, true, true, false),
  (gen_random_uuid(), 'Folga', true, true, true, true),
  (gen_random_uuid(), 'Home Office', true, true, false, false),
  (gen_random_uuid(), 'Atestado Médico', true, false, true, false),
  (gen_random_uuid(), 'Ausência', true, false, true, false),
  (gen_random_uuid(), 'Licença', true, false, true, false),
  (gen_random_uuid(), 'Suspensão', true, false, false, false),
  (gen_random_uuid(), 'Advertência', true, false, false, false),
  (gen_random_uuid(), 'Outro', true, false, false, false);

-- Migração de dados: Ferias -> Solicitacao (tipo "Férias", preserva status/aprovação)
INSERT INTO "Solicitacao" ("id", "userId", "tipoId", "dataInicio", "dataFim", "descricao", "status", "decididoPorId", "decididoEm", "registradoPorId", "criadoEm", "atualizadoEm")
SELECT
  f."id",
  f."userId",
  (SELECT id FROM "TipoSolicitacao" WHERE "nome" = 'Férias'),
  f."dataInicio",
  f."dataFim",
  f."observacao",
  f."status"::text::"SolicitacaoStatus",
  f."aprovadoPorId",
  f."aprovadoEm",
  f."userId",
  f."criadoEm",
  f."atualizadoEm"
FROM "Ferias" f;

-- Migração de dados: Ocorrencia -> Solicitacao (mapeia o enum antigo para o tipo equivalente, já como APROVADA)
INSERT INTO "Solicitacao" ("id", "userId", "tipoId", "dataInicio", "dataFim", "descricao", "status", "decididoPorId", "decididoEm", "registradoPorId", "criadoEm", "atualizadoEm")
SELECT
  o."id",
  o."userId",
  (SELECT id FROM "TipoSolicitacao" WHERE "nome" = CASE o."tipo"
    WHEN 'AUSENCIA' THEN 'Ausência'
    WHEN 'ATESTADO_MEDICO' THEN 'Atestado Médico'
    WHEN 'SUSPENSAO' THEN 'Suspensão'
    WHEN 'ADVERTENCIA' THEN 'Advertência'
    WHEN 'LICENCA' THEN 'Licença'
    ELSE 'Outro'
  END),
  o."dataInicio",
  o."dataFim",
  o."descricao",
  'APROVADA'::"SolicitacaoStatus",
  o."registradoPorId",
  o."criadoEm",
  o."registradoPorId",
  o."criadoEm",
  o."atualizadoEm"
FROM "Ocorrencia" o;

-- DropForeignKey
ALTER TABLE "Ferias" DROP CONSTRAINT "Ferias_aprovadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "Ferias" DROP CONSTRAINT "Ferias_userId_fkey";

-- DropForeignKey
ALTER TABLE "Ocorrencia" DROP CONSTRAINT "Ocorrencia_registradoPorId_fkey";

-- DropForeignKey
ALTER TABLE "Ocorrencia" DROP CONSTRAINT "Ocorrencia_userId_fkey";

-- DropTable
DROP TABLE "Ferias";

-- DropTable
DROP TABLE "Ocorrencia";

-- DropEnum
DROP TYPE "FeriasStatus";

-- DropEnum
DROP TYPE "OcorrenciaTipo";
