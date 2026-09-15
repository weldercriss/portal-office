# Tela de listagem com config própria ganha um botão de atalho

Quando um módulo tem uma tela de configuração dedicada em
`/configuracoes/<algo>` (aba em `ConfiguracoesLayout` ou rota aninhada tipo
`ConfiguracoesPlantoesLayout`), a tela de listagem principal desse módulo
**não força o admin a sair pelo menu lateral** — ela ganha um botão de atalho
no `ListToolbar`, ao lado da ação primária ("Novo X"), que navega direto pra
lá. Não duplique a tela de configuração dentro do módulo; o atalho só
reaproveita a rota que já existe.

Padrão usado em `SolicitacoesAdminPage.tsx` (→
`/configuracoes/tipos-solicitacao`) e `PlantoesAdminPage.tsx` (→
`/configuracoes/plantoes`):

```tsx
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function XAdminPage() {
  const navigate = useNavigate();
  // ...
  return (
    <ListToolbar
      actions={
        <>
          <Button variant="secondary" className="gap-1.5" onClick={() => navigate('/configuracoes/<algo>')}>
            <Settings aria-hidden="true" className="h-4 w-4" />
            Configurar <algo>
          </Button>
          <Button onClick={abrirNovo}>Novo <algo></Button>
        </>
      }
    >
      {/* filtros/busca */}
    </ListToolbar>
  );
}
```

`useNavigate()` exige contexto de `<Router>` — teste de página que passa a
usar esse hook precisa envolver o `render` com `MemoryRouter` (ver
`SolicitacoesAdminPage.test.tsx`), senão quebra com "useNavigate() may be
used only in the context of a Router component".

Isso é convenção pra **todo módulo novo** que tiver uma listagem principal +
uma tela de configuração separada — não é específico de solicitações ou
plantões.

## Checklist

- [ ] Módulo tem config em `/configuracoes/<algo>`? Então a listagem
      principal tem o botão "Configurar <algo>" no `ListToolbar`, não só o
      menu lateral.
- [ ] Botão usa `variant="secondary"`, ícone `Settings` do `lucide-react`, e
      `useNavigate()` — não duplica a tela de config em outra rota.
- [ ] Teste da página que ganhou `useNavigate()` usa
      `render(<Page />, { wrapper: MemoryRouter })`.
