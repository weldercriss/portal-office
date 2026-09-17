-- CreateEnum
CREATE TYPE "ConviteAgendaModo" AS ENUM ('COPIAS_INDIVIDUAIS', 'EVENTO_COM_CONVIDADOS');

-- CreateEnum
CREATE TYPE "ConviteAgendaEventoStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHA', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ConviteAgendaResposta" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'TALVEZ', 'DESCONHECIDO');

-- AlterTable: campos do evento único (modo EVENTO_COM_CONVIDADOS). O default
-- preserva os registros existentes como COPIAS_INDIVIDUAIS (modo legado).
ALTER TABLE "ConviteAgendaEvento" ADD COLUMN     "modo" "ConviteAgendaModo" NOT NULL DEFAULT 'COPIAS_INDIVIDUAIS',
ADD COLUMN     "statusEvento" "ConviteAgendaEventoStatus",
ADD COLUMN     "organizadorEmail" TEXT,
ADD COLUMN     "organizadorGoogleSub" TEXT,
ADD COLUMN     "calendarId" TEXT,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "ultimoErro" TEXT,
ADD COLUMN     "enviadoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "respostasSincronizadasEm" TIMESTAMP(3);

-- DropForeignKey: userId vira opcional (destinatário sem cadastro no portal)
ALTER TABLE "ConviteAgendaDestinatario" DROP CONSTRAINT "ConviteAgendaDestinatario_userId_fkey";

-- AlterTable: userId/status passam a ser opcionais (uso exclusivo do modo
-- legado); email/nome/resposta/respondidoEm nascem do evento único. "email"
-- fica nullable até o backfill abaixo.
ALTER TABLE "ConviteAgendaDestinatario" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "nome" TEXT,
ADD COLUMN     "resposta" "ConviteAgendaResposta" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "respondidoEm" TIMESTAMP(3);

-- Backfill: até aqui "userId" era obrigatório em todo registro, então todo
-- destinatário existente tem um User para casar o e-mail/nome.
UPDATE "ConviteAgendaDestinatario" d
SET "email" = LOWER(TRIM(COALESCE(d."usuarioEmail", u."email"))),
    "nome" = u."nome"
FROM "User" u
WHERE u."id" = d."userId"
  AND d."email" IS NULL;

ALTER TABLE "ConviteAgendaDestinatario" ALTER COLUMN "email" SET NOT NULL;

-- AddForeignKey: userId agora opcional; excluir o usuário não trava mais por
-- causa do histórico de convites.
ALTER TABLE "ConviteAgendaDestinatario" ADD CONSTRAINT "ConviteAgendaDestinatario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: segunda barreira contra duplicidade, aplicada depois do
-- backfill. Duas linhas com o mesmo e-mail no mesmo convite exigiriam dois
-- User com o mesmo e-mail, o que o cadastro de colaboradores já não permite.
CREATE UNIQUE INDEX "ConviteAgendaDestinatario_conviteId_email_key" ON "ConviteAgendaDestinatario"("conviteId", "email");
