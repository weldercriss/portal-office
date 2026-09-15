# Migrations — nunca alterar o banco sem gerar uma

Regra obrigatória do projeto: **nenhuma mudança de schema chega ao banco sem
passar por uma migration do Prisma.**

- Alterando o schema em desenvolvimento: `npx.cmd prisma migrate dev --name
  <nome-descritivo>` (dentro de `backend/`). Isso gera o arquivo em
  `backend/prisma/migrations/` e já regenera o Prisma Client.
- Aplicando migrations já existentes num banco (CI, outro ambiente, banco
  novo): `npx.cmd prisma migrate deploy`. O entrypoint de produção já roda
  isso automaticamente antes de subir a aplicação.
- Nome da migration descreve a mudança, não a data (`add-status-equipamento`,
  não `update-2026-09-10`) — o timestamp já vai no prefixo do arquivo gerado.
- Remover ou renomear coluna com dado existente exige plano de transição
  (coluna nova + backfill numa migration, remoção da antiga numa migration
  seguinte depois que nada mais lê a antiga) — nunca um `DROP COLUMN` direto
  numa coluna com consumidor ativo.
- Antes de considerar um ambiente atualizado, confira com
  `npx.cmd prisma migrate status` — não presuma que as migrations foram
  aplicadas.

## Checklist

- [ ] Migration gerada via `migrate dev`/`migrate deploy`, sem edição manual
      do banco?
- [ ] Nome da migration descreve a mudança, não uma data?
- [ ] Remoção/renomeação de coluna com dado em produção tem plano de
      transição, não um `DROP` direto?
- [ ] `prisma migrate status` conferido no ambiente relevante antes de
      afirmar que ele está atualizado?
