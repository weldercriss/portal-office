-- CreateTable
CREATE TABLE "TelegramConfig" (
    "id" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TelegramConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramNotificacaoTipo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "enviar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TelegramNotificacaoTipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramNotificacaoTipo_tipo_key" ON "TelegramNotificacaoTipo"("tipo");

-- Seed: catálogo dos tipos de notificação já disparados hoje pelo sistema (todos começam desligados no Telegram)
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar") VALUES
  (gen_random_uuid(), 'PLANTAO_VINCULADO', 'Plantão vinculado a você', false),
  (gen_random_uuid(), 'PLANTAO_REJEITADO', 'Plantão rejeitado', false),
  (gen_random_uuid(), 'TROCA_SOLICITADA', 'Troca de plantão solicitada', false),
  (gen_random_uuid(), 'TROCA_ACEITA', 'Troca de plantão aceita', false),
  (gen_random_uuid(), 'TROCA_REJEITADA', 'Troca de plantão rejeitada', false),
  (gen_random_uuid(), 'SOLICITACAO_CRIADA', 'Nova solicitação criada', false),
  (gen_random_uuid(), 'SOLICITACAO_APROVADA', 'Solicitação aprovada', false),
  (gen_random_uuid(), 'SOLICITACAO_REJEITADA', 'Solicitação rejeitada', false);
