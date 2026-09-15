-- Seed: novo tipo de notificação para o lembrete de término da reserva.
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar", "enviarGrupo") VALUES
  (gen_random_uuid(), 'RESERVA_SALA_LEMBRETE_FIM', 'Lembrete: reserva termina em 30 minutos', false, false)
ON CONFLICT ("tipo") DO NOTHING;
