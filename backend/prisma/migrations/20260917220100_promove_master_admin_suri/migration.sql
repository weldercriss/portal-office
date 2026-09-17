-- Seed/promocao do usuario master padrao da plataforma (admin@suri.ai).
--
-- Se o e-mail ja existir (ex.: producao, onde essa conta ja foi criada por um
-- fluxo anterior com essa mesma senha), so promove o role para MASTER -- a
-- senha e os demais dados existentes NUNCA sao sobrescritos aqui. Se o e-mail
-- ainda nao existir (ex.: banco novo/dev), cria a conta com a senha padrao
-- abaixo, ja em hash.
--
-- Hash bcrypt (custo 12, mesmo padrao de backend/prisma/seed-production.ts)
-- de '@@@@@@1234567890', pre-computado -- migration nao roda codigo Node.
INSERT INTO "User" ("id", "nome", "email", "senhaHash", "role", "ativo", "acessoPlataforma", "criadoEm")
VALUES (
  gen_random_uuid(),
  'Master',
  'admin@suri.ai',
  '$2b$12$rd7HrinmRN047qRA4usace44XVBCqMzqkhuOX2YJIRnvBqzxZAK82',
  'MASTER',
  true,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET "role" = 'MASTER';
