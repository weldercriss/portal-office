-- Generaliza ChecklistAdmissaoItem -> ChecklistItem: mesmo dado, ganha tipo
-- (ADMISSAO/DESLIGAMENTO), categoria livre e observação interna. Renomeia a
-- tabela e as constraints em vez de recriar, preservando os registros
-- existentes e o histórico.

ALTER TABLE "ChecklistAdmissaoItem" RENAME TO "ChecklistItem";
ALTER TABLE "ChecklistItem" RENAME CONSTRAINT "ChecklistAdmissaoItem_pkey" TO "ChecklistItem_pkey";
ALTER TABLE "ChecklistItem" RENAME CONSTRAINT "ChecklistAdmissaoItem_userId_fkey" TO "ChecklistItem_userId_fkey";

CREATE TYPE "TipoChecklist" AS ENUM ('ADMISSAO', 'DESLIGAMENTO');

-- NOT NULL + DEFAULT numa mesma ALTER TABLE já faz o backfill dos registros existentes.
ALTER TABLE "ChecklistItem" ADD COLUMN "tipo" "TipoChecklist" NOT NULL DEFAULT 'ADMISSAO';
ALTER TABLE "ChecklistItem" ADD COLUMN "categoria" TEXT;
ALTER TABLE "ChecklistItem" ADD COLUMN "observacaoInterna" TEXT;
