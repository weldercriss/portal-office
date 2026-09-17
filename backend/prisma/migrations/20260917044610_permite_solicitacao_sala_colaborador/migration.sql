-- CreateTable
CREATE TABLE "AgendamentoConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "permiteSolicitacaoColaborador" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendamentoConfig_pkey" PRIMARY KEY ("id")
);

-- Solicitações feitas pelo próprio colaborador usam um aviso separado da
-- confirmação administrativa. O envio começa desligado, como os demais tipos.
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar", "enviarGrupo") VALUES
  (gen_random_uuid(), 'RESERVA_SALA_SOLICITADA', 'Solicitação de sala enviada', false, false)
ON CONFLICT ("tipo") DO NOTHING;
