-- Seed: tipo de notificação para comunicados/avisos internos (começa desligado no Telegram)
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar") VALUES
  (gen_random_uuid(), 'COMUNICADO', 'Comunicado interno', false);
