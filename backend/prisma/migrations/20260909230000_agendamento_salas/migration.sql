-- CreateEnum
CREATE TYPE "ReservaStatus" AS ENUM ('SOLICITADA', 'CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "localizacao" TEXT,
    "capacidade" INTEGER,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaDisponibilidade" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL DEFAULT 60,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaDisponibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "titulo" TEXT,
    "observacoes" TEXT,
    "status" "ReservaStatus" NOT NULL DEFAULT 'CONFIRMADA',
    "registradoPorId" TEXT NOT NULL,
    "canceladoEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaEventoAgenda" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usuarioEmail" TEXT NOT NULL,
    "googleSub" TEXT,
    "calendarId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservaEventoAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaSyncPendente" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proximaTentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoErro" TEXT,
    "aguardandoReconexaoUserId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservaSyncPendente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sala_nome_key" ON "Sala"("nome");

-- CreateIndex
CREATE INDEX "SalaDisponibilidade_salaId_diaSemana_idx" ON "SalaDisponibilidade"("salaId", "diaSemana");

-- CreateIndex
CREATE INDEX "Reserva_salaId_data_idx" ON "Reserva"("salaId", "data");

-- CreateIndex
CREATE INDEX "Reserva_solicitanteId_idx" ON "Reserva"("solicitanteId");

-- CreateIndex
CREATE INDEX "Reserva_data_status_idx" ON "Reserva"("data", "status");

-- CreateIndex
CREATE INDEX "ReservaEventoAgenda_reservaId_idx" ON "ReservaEventoAgenda"("reservaId");

-- CreateIndex
CREATE INDEX "ReservaEventoAgenda_userId_idx" ON "ReservaEventoAgenda"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaEventoAgenda_reservaId_userId_key" ON "ReservaEventoAgenda"("reservaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaSyncPendente_reservaId_key" ON "ReservaSyncPendente"("reservaId");

-- CreateIndex
CREATE INDEX "ReservaSyncPendente_proximaTentativa_idx" ON "ReservaSyncPendente"("proximaTentativa");

-- CreateIndex
CREATE INDEX "ReservaSyncPendente_aguardandoReconexaoUserId_idx" ON "ReservaSyncPendente"("aguardandoReconexaoUserId");

-- AddForeignKey
ALTER TABLE "SalaDisponibilidade" ADD CONSTRAINT "SalaDisponibilidade_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: nova rotina "agendamentos" (reserva de salas)
INSERT INTO "Rotina" ("id", "chave", "nome", "ativo") VALUES
  (gen_random_uuid(), 'agendamentos', 'Agendamento de salas', true)
ON CONFLICT ("chave") DO NOTHING;

-- Seed: liga a rotina "agendamentos" a todos os departamentos existentes, para
-- nao travar o acesso de quem ja estava cadastrado (admin ajusta depois).
INSERT INTO "GroupRotina" ("id", "groupId", "rotinaId")
SELECT gen_random_uuid(), g."id", r."id"
FROM "Group" g
CROSS JOIN "Rotina" r
WHERE r."chave" = 'agendamentos'
ON CONFLICT ("groupId", "rotinaId") DO NOTHING;

-- Seed: tipos de notificação do agendamento de salas (começam desligados no Telegram)
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar") VALUES
  (gen_random_uuid(), 'RESERVA_SALA_CRIADA', 'Sala reservada para você', false),
  (gen_random_uuid(), 'RESERVA_SALA_ATUALIZADA', 'Reserva de sala atualizada', false),
  (gen_random_uuid(), 'RESERVA_SALA_CANCELADA', 'Reserva de sala cancelada', false)
ON CONFLICT ("tipo") DO NOTHING;
