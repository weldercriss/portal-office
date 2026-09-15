# Design system — Tangram + shell do CS-OPS

Referência visual do template. Combina duas origens:

- **Paleta, tipografia e formas:** design system **Tangram** do RD Station,
  extraído dos estilos computados de `app.rdstation.com.br/dashboard` em
  **21/08/2026** (os CSS `tangram-design-tokens.*` denunciam o nome).
- **Estrutura de shell e ícones:** o layout do **CS-OPS / staging**
  (`CS-OPS/staging/frontend/app-portal-ops/src/components/system/AppLayout.tsx`)
  — header full-width sólido, rail de ícones e conteúdo em superfície clara com
  o canto recortado. Os ícones de navegação vêm de
  `CS-OPS/staging/frontend/packages/assets/public/svg`.

> ⚠️ **Como usar:** material de **referência/inspiração** para acelerar projetos
> próprios. Não é uma cópia do produto do RD Station nem deve ser usado para se
> passar por eles. Troque marca, cores e logotipo conforme seu projeto.

## Estrutura

```
design-system/
├─ README.md                ← este arquivo
├─ preview.html             ← style guide visual (abra no navegador)
├─ reference-screenshot.png ← captura da tela de origem
└─ tokens/
   ├─ tokens.json           ← tokens normalizados, com o nome da CSS var de cada um
   ├─ variables.css         ← CSS custom properties prontas (var(--...))
   ├─ components.css        ← receitas: shell, rail, botões, cards, KPI, campos, badges, tabela
   └─ raw-extract.json      ← dump bruto da extração original (auditoria; não editar)
```

**Onde os tokens vivem de verdade?** O app consome `src/index.css`.
Esta pasta é a documentação — `tokens/variables.css` é um **espelho** daquele
arquivo. Mudou um token? Mude nos dois.

## Como começar

1. Abra `preview.html` no navegador para ver tudo aplicado.
2. Num projeto sem Tailwind, importe os dois CSS:
   ```html
   <link rel="stylesheet" href="tokens/variables.css" />
   <link rel="stylesheet" href="tokens/components.css" />
   ```
3. Consuma os tokens: `color: var(--color-text-primary)`, `border-radius: var(--radius-card)`.

Num projeto com Tailwind, copie `src/index.css` e `tailwind.config.ts` do
template — as classes já referenciam as mesmas variáveis.

## Fundamentos

| Categoria | Valores-chave |
|---|---|
| **Display** | `Bricolage Grotesque` — nome do produto no header e títulos de página |
| **Corpo/UI** | `DM Sans` (fallback Nunito Sans → Open Sans → Arial) · 16px / line-height 1.5 |
| **Pesos** | 400 corpo · 500 rótulo · **700 UI e display** · **900 números de KPI** |
| **Escala tipográfica** | 11 · 12 · 13 · 14 · **16** · 20 · 24 · **28** · 36 px |
| **Espaço** | base-4 → 4 · 8 · 12 · 16 · 24 · 32 · 48 px |
| **Raios** | 12 (botões/campos) · **16 (cards)** · **20 (shell)** · 999 (pill) |
| **Elevação** | única: `0 4px 12px rgb(0 34 51 / 14%)` |

Duas famílias, com papéis separados: Bricolage Grotesque só no display, DM Sans
no resto — onde o contraste vem do peso. Ambas carregadas via Google Fonts.

## Paleta

**Marca**
`--color-accent` cyan `#00DBFF` (assinatura) · `--color-primary-soft` `#B2F4FF`
(fundo de botão/badge) · `--color-primary` blue `#0077B2` (ação/links) ·
`--color-teal` `#11A7B6` / soft `#81F0D8` · `--color-purple` `#8800F7` / soft `#DBB2FC`

**Texto:** primary `#002233` · secondary `#405466` · muted `#7F8D99`

**Superfícies:** background `#EDEFF1` · surface `#FFFFFF` · hover `#E5E8EA` · dark `#002233`

**Bordas:** default `#D6DBDE` · strong `#B2BCC1`

**Semânticas:** success `#0E7A4A` · warning `#8A5300` · danger `#B31D1D`, cada uma
com seu par "soft" de fundo. São versões escurecidas — os acentos crus do Tangram
(`#27F182`) não têm contraste para texto.

## Shell

| Token | Valor | Papel |
|---|---|---|
| `--shell-size` | `64px` | altura do header **e** largura do rail |
| `--shell-header-bg` | `#001824` | header sólido, no topo do gradiente |
| `--shell-radius` | `20px` | canto superior esquerdo do `<main>` |
| `--gradient-rail` | `#001824 → #002233 → #003D5C` | fundo do rail, `background-attachment: fixed` |
| `--rail-active` | `#00DBFF` | barra de 6px do item de navegação ativo |
| `--rail-hover` | `rgb(255 255 255 / 12%)` | fundo do item no hover |
| `--tooltip-bg` | `#001824` | tooltip escuro à direita do rail |

O gradiente pinta o corpo do shell; o `<main>` é uma superfície clara por cima,
com um único canto arredondado. É esse recorte que dá o efeito de camada.

**O shell é fixo.** A raiz é `height: 100dvh; overflow: hidden` e só o painel de
conteúdo rola — header e rail nunca saem da tela. Os itens do rail têm 40px
(64 − 2×12 de padding), gap de 8px, e o topo alinha com o raio do painel.
**Não há ícone de logout no rail**: a conta vive no header.

## Ícones

Duas fontes, com papéis separados — a mesma divisão do staging:

| Uso | Origem | Como |
|---|---|---|
| Navegação (rail, menus, listas) | conjunto Tangram em `public/assets/svg/` | componente `SvgIcon`, que aplica o arquivo como CSS `mask` sobre `bg-current` — assim o ícone herda o `text-*` do pai e acompanha os estados ativo/inativo |
| Ícones miúdos de UI (busca, editar, remover, fechar, seta) | `lucide-react` | componente React direto |

`<img>` não serve para a navegação porque não permite recolorir via
`currentColor`. Para ver os nomes disponíveis: `ls public/assets/svg`.

## Padrões observados

- **Botão primário:** fundo `--color-primary-soft` `#B2F4FF` + texto
  `--color-primary` `#0077B2`, peso 700, raio 12px. No hover vira cyan sólido.
- **Card:** fundo branco, borda 1px `#D6DBDE`, raio 16px, padding 24px; a sombra
  é opcional e só existe uma.
- **KPI card:** raio 16px, padding 24px; estágio ativo em cyan sólido, inativos
  em cinza `#E5E8EA`; selo de conversão em navy sólido.
- **Título de página:** Bricolage 28px, peso 700, tracking −0.5px.
- **Cabeçalho de card / tabela:** 13px e 12px, peso 700, caixa alta, `muted`.

## Reproduzir / atualizar a extração

O snippet de extração (rode no Console/F12 de uma página logada) e o resultado
original estão em `tokens/raw-extract.json`. Para atualizar, rode o snippet em
outra tela e reconcilie com `tokens.json`.
