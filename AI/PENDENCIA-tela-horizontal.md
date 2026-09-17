# Pendência: aplicar a regra tela-horizontal em todo o projeto

Doc isolado para outro agente continuar. Não misturar com TASKS.md/CONTEXT.md.
Regra completa em [SKILLS/FRONTEND/tela-horizontal.md](SKILLS/FRONTEND/tela-horizontal.md).

## Feito nesta sessão (17/09/2026)

Auditados todos os `<Dialog>` do frontend. Corrigidos os que violavam a regra
(largura estreita e/ou campos em `flex flex-col` empilhados em vez de grid):

- `frontend/src/modules/solicitacoes/pages/SolicitacoesPage.tsx` — Dialog sem
  `className` (caía no `max-w-md` padrão) e campos empilhados → `max-w-3xl` +
  `fitViewport` + grid 2 colunas.
- `frontend/src/modules/solicitacoes/pages/SolicitacoesAdminPage.tsx` — grid já
  existia, faltava largura → `max-w-2xl` → `max-w-3xl` + `fitViewport`.
- `frontend/src/modules/convites-agenda/components/ConviteAgendaDialog.tsx` —
  campos soltos fora do grid → `max-w-2xl` → `max-w-3xl` + `fitViewport` +
  Título/Local/Descrição unidos ao grid existente.
- `frontend/src/modules/plantoes/pages/PlantoesAdminPage.tsx` — 4 campos
  empilhados → grid 2 colunas, `className="max-w-xl"`.
- `frontend/src/modules/tipos-plantao/pages/TiposPlantaoAdminPage.tsx` — 4
  campos empilhados → grid 2 colunas, `className="max-w-xl"`.
- `frontend/src/modules/patrimonio/components/VinculoDialog.tsx` — 4 campos
  empilhados → grid 2 colunas.
- `frontend/src/modules/agendamento/components/ReservaDialog.tsx` — já era
  largo (`max-w-4xl`), faltava `fitViewport` (crescia pra baixo da viewport) e
  a lista dinâmica de `@usuário do Telegram` estava empilhada → agora em grid.

## Concluído na continuação (17/09/2026)

Os dois diálogos que já estavam conformes em largura e grid agora também usam
`fitViewport`, para limitar a altura à viewport e manter a rolagem dentro do
modal quando o conteúdo crescer:

- [x] `frontend/src/modules/agendamento/components/SalaDialog.tsx`
      (`className="max-w-4xl"`) — a grade de disponibilidade pode crescer
      bastante.
- [x] `frontend/src/modules/subareas/components/SubAreasDialog.tsx`
      (`className="max-w-5xl"`) — a lista de subáreas mantém sua rolagem
      interna (`max-h-[45vh] overflow-y-auto`) e o diálogo não ultrapassa a
      viewport.

## Não corrigido, fora do escopo desta rodada

- `frontend/src/modules/agendamento/components/ReservaDialog.tsx` (linhas
  ~205-226): bloco Início/Fim do horário usa `flex w-32 flex-col` lado a lado
  com um parágrafo (`flex-wrap items-end gap-4`), não `grid`. Já fica
  horizontal na prática (não estava empilhado), então não convertido para não
  arriscar quebrar o layout ao lado do widget `GradeHorarios`. Reavaliar só se
  o layout apresentar problema real.

## Validação e fechamento

- [x] Build completo do frontend: `npm.cmd run build` (`tsc -b && vite build`).
- [x] Suíte completa do frontend: `npm.cmd test` — 31 arquivos e 169 testes
      aprovados.

Na primeira execução, feita em paralelo com o build, um teste de
`ColaboradoresAdminPage` excedeu o timeout de 5 segundos. A suíte foi repetida
isoladamente e passou por completo; não houve falha funcional.

Arquivos tocados nesta sessão: `SolicitacoesPage.tsx`,
`SolicitacoesAdminPage.tsx`, `ConviteAgendaDialog.tsx`,
`PlantoesAdminPage.tsx`, `TiposPlantaoAdminPage.tsx`, `VinculoDialog.tsx`,
`ReservaDialog.tsx`, `SalaDialog.tsx` e `SubAreasDialog.tsx`.
