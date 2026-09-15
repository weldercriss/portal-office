# Seed de desenvolvimento vs. seed de produção

São dois scripts distintos, não intercambiáveis:

- `backend/prisma/seed.ts` (`npm.cmd run prisma:seed`, mapeado em
  `prisma.seed` do `package.json`) — seed de **desenvolvimento**, pensado
  para a primeira configuração de um banco local vazio.
- Seed de **produção** — script separado, só executa quando a variável de
  ambiente `RUN_SEED=true` está definida no ambiente. O entrypoint de
  produção decide se roda com base nessa flag, não por padrão.

Nunca aponte o fluxo de produção para `prisma/seed.ts` nem assuma que rodar
o seed de dev duas vezes é seguro sem checar o que ele cria — trate os dois
como scripts com público e garantias diferentes.

## Checklist

- [ ] O seed alterado/criado está no arquivo certo (dev vs. produção) para o
      público a que se destina?
- [ ] Nenhuma mudança fez o fluxo de produção depender do seed de
      desenvolvimento?
