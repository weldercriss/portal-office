-- AlterTable: decidido na criação do convite (não muda em edições); default
-- true preserva o comportamento atual (todo convite pede link do Meet).
ALTER TABLE "ConviteAgendaEvento" ADD COLUMN     "comMeet" BOOLEAN NOT NULL DEFAULT true;
