# Organização de um módulo de frontend

Cada área de negócio é uma pasta em `frontend/src/modules/<dominio>/`. O
padrão já usado em `solicitacoes`, `agendamento`, `usuarios` etc.:

```
<dominio>/
├── api/          # chamadas HTTP via frontend/src/api/httpClient.ts
├── hooks/        # useQuery/useMutation do TanStack Query
├── types/        # tipos TypeScript do domínio
├── pages/        # telas, carregadas com lazy/Suspense pelo router
├── components/   # componentes específicos deste módulo
└── utils/        # funções puras específicas do domínio (opcional)
```

Componentes realmente compartilhados entre módulos ficam em
`frontend/src/components/ui/` (primitivas) ou `components/system/`
(compostos do portal) — não duplique um componente de módulo em outro
domínio; se ele passou a ser usado em mais de um lugar, promova-o para lá.

Páginas novas são registradas em `frontend/src/router/` com `lazy`, e o item
de menu correspondente em `frontend/src/app/layouts/navigation.ts`,
condicionado à rotina do módulo (ver
[permissoes-e-rotas.md](permissoes-e-rotas.md)).

## Checklist

- [ ] O módulo novo segue a divisão `api/hooks/types/pages/components`?
- [ ] Nenhum componente foi duplicado entre módulos em vez de promovido para
      `components/ui/` ou `components/system/`?
- [ ] Página nova está registrada em `router/` (lazy) e, se aplicável, em
      `navigation.ts`?
