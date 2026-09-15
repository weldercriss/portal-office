# Módulo docs (Documentação)

Ainda não implementado. Quando for a vez deste módulo, seguir o mesmo contrato do módulo `status` (`../status/`):

```
modules/docs/
├── api/docs.api.ts       → chamadas HTTP (nunca "services/")
├── components/                → componentes específicos do módulo
├── hooks/                     → TanStack Query (queryKey inclui todo parâmetro de filtro)
├── pages/DocsPage.tsx     → isError → isLoading → vazio → conteúdo, sempre nessa ordem
├── types/docs.types.ts
└── utils/                     → funções puras específicas do módulo (se necessário)
```

Rota registrada em `src/router/AppRoutes.tsx` com `lazy()`; entrada de navegação adicionada em `src/app/layouts/AppShell.tsx` (`NAV_ITEMS`).
