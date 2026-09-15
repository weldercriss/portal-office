---
name: run-portal-backoffice
description: Use when asked to run, start, launch, or set up the Portal BackOffice project locally (backend NestJS + frontend Vite + PostgreSQL via Docker). Covers ports, env setup, migrations and start commands for both projects.
---

# Rodar o Portal BackOffice localmente

Resumo rápido de execução. O passo a passo completo e os detalhes de cada
etapa vivem em `AI/SKILLS/`, que é a fonte de verdade (compartilhada com
qualquer IA no projeto, não só o Claude Code) — este arquivo só orquestra a
ordem:

1. **Banco** — [AI/SKILLS/DATABASE/banco-de-dados-local.md](../../AI/SKILLS/DATABASE/banco-de-dados-local.md)
   (`docker compose up -d` dentro de `backend/`; serviço `postgres`, porta
   `5433`).
2. **Migrations** — [AI/SKILLS/DATABASE/migrations.md](../../AI/SKILLS/DATABASE/migrations.md)
   (`npx.cmd prisma migrate deploy`, ou `migrate dev` só ao alterar o
   schema).
3. **API** — [AI/SKILLS/BACKEND/subir-a-api-localmente.md](../../AI/SKILLS/BACKEND/subir-a-api-localmente.md)
   (`npm.cmd ci` e `npm.cmd run start:dev` dentro de `backend/`, porta
   `3333`).
4. **Frontend** — [AI/SKILLS/FRONTEND/rodar-o-frontend-localmente.md](../../AI/SKILLS/FRONTEND/rodar-o-frontend-localmente.md)
   (`npm.cmd ci` e `npm.cmd run dev` dentro de `frontend/`, porta `5173`).

Cada projeto (`backend/` e `frontend/`) tem seu próprio `package.json` e é
instalado/rodado a partir da sua própria pasta — não há workspace na raiz
coordenando os dois.

Ver também [docs/reference/como-rodar.md](../../docs/reference/como-rodar.md)
para o guia completo, incluindo produção e Docker Compose de deploy.
