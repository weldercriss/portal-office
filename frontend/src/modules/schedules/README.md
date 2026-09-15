# Módulo schedules (Escalas de plantão)

Ainda não implementado. Quando for a vez deste módulo, seguir o mesmo contrato do módulo `status` (`../status/`):

```
modules/schedules/
├── api/schedules.api.ts       → chamadas HTTP (nunca "services/")
├── components/                → componentes específicos do módulo
├── hooks/                     → TanStack Query (queryKey inclui todo parâmetro de filtro)
├── pages/SchedulesPage.tsx     → isError → isLoading → vazio → conteúdo, sempre nessa ordem
├── types/schedules.types.ts
└── utils/                     → funções puras específicas do módulo (se necessário)
```

Rota registrada em `src/router/AppRoutes.tsx` com `lazy()`; entrada de navegação adicionada em `src/app/layouts/AppShell.tsx` (`NAV_ITEMS`).
