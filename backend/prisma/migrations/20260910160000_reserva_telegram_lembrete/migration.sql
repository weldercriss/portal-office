-- Preserva o comportamento atual (todo mundo recebia aviso): default true.
ALTER TABLE "Reserva" ADD COLUMN "notificarTelegram" BOOLEAN NOT NULL DEFAULT true;

-- Marca se o lembrete de 30 minutos antes já saiu, para o worker não repetir.
ALTER TABLE "Reserva" ADD COLUMN "lembrete30MinEnviado" BOOLEAN NOT NULL DEFAULT false;

-- Seed: novos tipos de notificação do Telegram para o ciclo de status da reserva.
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar") VALUES
  (gen_random_uuid(), 'RESERVA_SALA_CONFIRMADA', 'Reserva de sala confirmada', false),
  (gen_random_uuid(), 'RESERVA_SALA_LEMBRETE', 'Lembrete: reserva em 30 minutos', false)
ON CONFLICT ("tipo") DO NOTHING;
