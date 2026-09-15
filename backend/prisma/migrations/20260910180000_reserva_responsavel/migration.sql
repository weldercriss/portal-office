CREATE TYPE "ReservaDestinatarios" AS ENUM ('SOLICITANTE', 'RESPONSAVEL', 'AMBOS');

ALTER TABLE "Reserva"
ADD COLUMN "responsavelId" TEXT,
ADD COLUMN "destinatariosNotificacao" "ReservaDestinatarios" NOT NULL DEFAULT 'SOLICITANTE';

ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_responsavelId_fkey"
FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
