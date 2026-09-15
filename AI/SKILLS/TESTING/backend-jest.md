# Backend — Jest

- Rodar (dentro de `backend/`): `npm.cmd test -- --runInBand`.
- Teste `*.spec.ts` fica ao lado do arquivo testado, nunca numa pasta
  `__tests__/` separada — ex.: `backend/src/plantoes/plantoes.service.spec.ts`
  junto de `plantoes.service.ts`. O projeto já tem ~27 arquivos de spec
  cobrindo services, guards, workers e utils; siga esse padrão de
  posicionamento para módulos novos.
- Services mockam `PrismaService` (não sobem um banco real no teste
  unitário) — ver `solicitacoes.service.spec.ts` ou `plantoes.service.spec.ts`
  para o padrão de mock.
- Workers e integrações externas (Telegram, Agenda Google) também mockam o
  cliente externo — não disparam mensagem/evento de verdade num teste (ver
  `agenda-google.worker.spec.ts`, `telegram.service.spec.ts`).

## Checklist

- [ ] Novo `*.spec.ts` está ao lado do arquivo testado, no mesmo módulo?
- [ ] `PrismaService` e integrações externas estão mockadas, não reais?
