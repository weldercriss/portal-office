# Suri+ — frontend

React + Vite + TypeScript + Tailwind. O layout segue o **template Tangram**
(`tangram-dashboard-template`): header full-width fixo, rail de ícones de 64px
com tooltip e o conteúdo em superfície clara com o canto superior esquerdo
recortado, sobre o gradiente navy.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm test         # vitest run
```

A API fica em `VITE_API_BASE_URL` (padrão `http://localhost:3333`) — veja
`.env.example`.

## Design system

Os tokens vivem em [`src/index.css`](./src/index.css) e são consumidos sempre
via `var(--token)`; `tailwind.config.ts` nunca traz cor literal. A pasta
[`design-system/`](./design-system) é a documentação de referência do padrão
(guia, `preview.html` e tokens em CSS/JSON) — `design-system/tokens/variables.css`
é um espelho de `src/index.css`: **mudou um token, mude nos dois.**

- **Fontes:** Bricolage Grotesque no display · DM Sans no corpo/UI (Google Fonts,
  carregadas em `index.html`)
- **Cores-assinatura:** cyan `#00DBFF`, azul `#0077B2`, texto navy `#002233`
- **Formas:** cards 16px · botões e campos 12px · uma sombra só
- **Shell:** header e rail de 64px · canto do conteúdo 20px · gradiente
  `#001824 → #003D5C` · `100dvh` com `overflow: hidden` na raiz, de modo que só
  o painel de conteúdo rola
- **Ícones:** conjunto Tangram em `public/assets/svg/` para a navegação (via
  `SvgIcon`, que aplica o arquivo como CSS `mask` para o ícone herdar o
  `text-*` do pai) e `lucide-react` para os ícones miúdos de UI
- **Sem tema escuro:** o padrão Tangram é claro; não há `darkMode` no Tailwind

## Estrutura

```
frontend/
├─ index.html                   ← fontes do Google + favicon
├─ public/assets/svg/           ← ícones Tangram e logotipos
├─ design-system/               ← documentação do padrão (guia, preview, tokens)
└─ src/
   ├─ index.css                 ← ⭐ tokens usados pelo app
   ├─ config/brand.ts           ← nome do produto e logotipos do shell
   ├─ app/layouts/              ← AppShell · ConfiguracoesLayout · UserDropdown · navigation
   ├─ router/                   ← rotas e guarda de acesso
   ├─ components/system/        ← PageShell · ListToolbar · SearchField · SvgIcon
   ├─ components/ui/            ← primitivas sem conhecimento de domínio
   ├─ modules/<domínio>/        ← api · hooks · pages · types por módulo
   ├─ shared/auth/              ← contexto de autenticação
   └─ pages/LoginPage.tsx
```

A dependência corre em uma direção só: `pages` → `components` → `lib`.

## Navegação

O rail carrega **Meu perfil**, **Plantões**, **Férias** e — só para `ADMIN` —
**Configurações** (definidos em [`src/app/layouts/navigation.ts`](./src/app/layouts/navigation.ts)).
Como no Tangram, o rail não tem item de logout: a conta, a troca de senha e a
saída vivem no menu do header, que em telas estreitas (onde o rail fica oculto)
também repete os itens de navegação.

## Trocando a marca

1. Substitua os arquivos em `public/assets/svg/`.
2. Ajuste `src/config/brand.ts` (nome do produto e caminho dos logotipos).
3. Precisa de novo token/cor? Adicione em `src/index.css` e reflita em
   `design-system/tokens/variables.css`.
