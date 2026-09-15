ALTER TABLE "Solicitacao" ADD COLUMN "responsavelId" TEXT;

ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_responsavelId_fkey"
FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
