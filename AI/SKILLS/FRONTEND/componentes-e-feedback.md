# Diálogo do portal, nunca `alert()`/`confirm()` nativos

Confirmações e formulários modais usam o `Dialog` do portal
(`frontend/src/components/ui/Dialog`), como em
`frontend/src/modules/solicitacoes/pages/SolicitacoesAdminPage.tsx`:

```ts
import { Dialog } from '../../../components/ui/Dialog';

const [dialogAberto, setDialogAberto] = useState(false);
// ...
setDialogAberto(true); // abre em vez de window.confirm(...)
```

Nenhum lugar do frontend usa `alert()`/`confirm()`/`prompt()` nativos — não
introduza um desses como atalho para uma confirmação rápida; use `Dialog`
mesmo para casos simples de "tem certeza?".

Estados de carregamento, lista vazia e erro usam os componentes já prontos
em `frontend/src/components/ui/` (ver `states.test.tsx` para os casos
cobertos) — não escreva um `if (loading) return <p>Carregando...</p>` solto
quando já existe um componente de estado para isso.

## Checklist

- [ ] Nenhum `alert()`/`confirm()`/`prompt()` nativo foi introduzido — toda
      confirmação usa `Dialog`?
- [ ] Loading, lista vazia e erro usam os componentes de `components/ui/`
      existentes, não markup solto duplicando o mesmo comportamento?
