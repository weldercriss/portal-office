# Subir a API localmente

Passo a passo, dentro de `backend/`:

1. `npm.cmd ci`
2. Copiar `.env.example` para `.env` e ajustar se necessário (já vem
   apontando para o Postgres do Compose local, porta `5433`).
3. Subir o PostgreSQL: `docker compose up -d` (serviço `postgres`,
   `postgres:16-alpine`, porta `5433:5432`, credenciais e banco
   `portal_backoffice`).
4. `npm.cmd run prisma:generate`
5. `npx.cmd prisma migrate deploy` (aplica as migrations existentes; use
   `prisma migrate dev` só quando estiver alterando o schema — ver
   [../DATABASE/migrations.md](../DATABASE/migrations.md)).
6. Banco vazio na primeira configuração: `npm.cmd run prisma:seed`.
7. `npm.cmd run start:dev` — API em `http://localhost:3333`.

Guia completo, incluindo frontend e produção, em
[docs/reference/como-rodar.md](../../../docs/reference/como-rodar.md).

## Checklist

- [ ] `.env` aponta para o Postgres correto antes de rodar migrations?
- [ ] Migrations aplicadas (`migrate deploy`/`migrate dev`) antes de subir a
      API pela primeira vez num banco novo?
