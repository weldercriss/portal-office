# Antes de considerar uma tarefa concluída

Para qualquer tarefa que não seja um ajuste trivial de typo/texto/cor:

1. Rodar os testes relevantes à mudança (não só o arquivo tocado):
   `npm.cmd test -- --runInBand` no `backend/`, `npm.cmd test` no
   `frontend/`.
2. Rodar o build do(s) projeto(s) afetado(s): `npm.cmd run build`.
3. Se houve mudança de schema, conferir `npx.cmd prisma migrate status` no
   ambiente relevante — não presumir que a migration foi aplicada.
4. Atualizar `AI/CONTEXT.md` se a mudança alterou arquitetura, módulo ou
   regra de permissão; atualizar `AI/TASKS.md` se uma pendência foi
   concluída ou criada.
5. Registrar um resumo em `AI/SESSIONS/<dd-mm-aaaa>.md`.
6. Se a tarefa mudou um padrão de código, comando ou convenção, atualizar a
   skill correspondente em `AI/SKILLS/<área>/` (ou criar uma nova, se o tema
   ainda não tem uma) — skill desatualizada engana mais do que ajuda.

Não pular esses passos para já atender o próximo pedido do usuário; eles são
parte de terminar a tarefa, não um extra opcional.

## Checklist

- [ ] Testes e build relevantes rodaram de verdade (resultado real, não
      presumido)?
- [ ] `AI/CONTEXT.md`/`AI/TASKS.md` atualizados quando a mudança afeta o que
      eles descrevem?
- [ ] Sessão registrada em `AI/SESSIONS/`?
- [ ] Skill afetada em `AI/SKILLS/` está atualizada, se algum padrão mudou?
