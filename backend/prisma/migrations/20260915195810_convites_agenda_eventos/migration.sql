-- CreateEnum
CREATE TYPE "ConviteAgendaStatus" AS ENUM ('CRIADO', 'INDISPONIVEL', 'FALHA', 'CANCELADO');

-- CreateTable
CREATE TABLE "ConviteAgendaEvento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteAgendaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConviteAgendaDestinatario" (
    "id" TEXT NOT NULL,
    "conviteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ConviteAgendaStatus" NOT NULL,
    "usuarioEmail" TEXT,
    "googleSub" TEXT,
    "calendarId" TEXT,
    "eventId" TEXT,
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConviteAgendaDestinatario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConviteAgendaDestinatario_conviteId_idx" ON "ConviteAgendaDestinatario"("conviteId");

-- CreateIndex
CREATE INDEX "ConviteAgendaDestinatario_userId_idx" ON "ConviteAgendaDestinatario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConviteAgendaDestinatario_conviteId_userId_key" ON "ConviteAgendaDestinatario"("conviteId", "userId");

-- AddForeignKey
ALTER TABLE "ConviteAgendaEvento" ADD CONSTRAINT "ConviteAgendaEvento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteAgendaDestinatario" ADD CONSTRAINT "ConviteAgendaDestinatario_conviteId_fkey" FOREIGN KEY ("conviteId") REFERENCES "ConviteAgendaEvento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteAgendaDestinatario" ADD CONSTRAINT "ConviteAgendaDestinatario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
