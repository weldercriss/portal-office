# Frontend — Vitest + Testing Library

- Rodar (dentro de `frontend/`): `npm.cmd test`.
- Teste `*.test.ts`/`*.test.tsx` fica ao lado do arquivo testado — ex.:
  `frontend/src/modules/solicitacoes/pages/SolicitacoesAdminPage.test.tsx`
  junto da própria página. Componentes de UI compartilhados também têm teste
  ao lado (`components/ui/states.test.tsx`, `primitives-a.test.tsx` etc.).
- Priorize testar comportamento visível ao usuário (Testing Library:
  `render` + `screen` + interações), não detalhe de implementação interna do
  componente.
- Hooks de dados (`api/*.api.test.ts`) testam a chamada HTTP/transformação de
  dado, não a lógica do TanStack Query em si.

## Checklist

- [ ] Novo `*.test.tsx` está ao lado do arquivo testado, no mesmo módulo?
- [ ] O teste verifica comportamento visível (texto, interação), não
      detalhe interno de implementação?
