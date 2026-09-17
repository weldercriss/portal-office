# Tela horizontal: prioridade é largura, não altura

Regra "tela-horizontal": ao criar ou revisar **qualquer tela ou modal**
(`Dialog`, página cheia, painel), o layout dos campos deve priorizar a
**largura disponível** para evitar que o formulário fique alto e vertical,
como uma lista de campos empilhados exigindo rolagem para ver o botão
"Salvar". Isso vale para toda tela nova, mesmo que a área do produto
(plantões, patrimônio, colaboradores etc.) não tenha essa restrição hoje.

## Como aplicar

1. **`Dialog` largo, não estreito.** Não deixe no padrão `max-w-md` quando o
   formulário tem mais de ~4 campos. Use `className="max-w-3xl"` (ou
   `max-w-4xl`/`max-w-5xl` para formulários maiores) e passe `fitViewport`
   para o modal ocupar a altura da viewport com scroll interno só se
   sobrar conteúdo, em vez de crescer para baixo da tela.
2. **Campos em grid, não em coluna única.** Envolva os `FormField` em
   `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3` (ajuste
   o número de colunas ao espaço de `max-w-*` escolhido) em vez de
   `flex flex-col gap-4`. Campo que ocupa uma linha inteira sozinho
   (ex.: um `Select` de tipo) também deve entrar no grid, não ficar fora
   dele quebrando o alinhamento horizontal.
3. **Se mesmo assim não couber, divida em subtópicos (abas), nunca role.**
   Quando o formulário tem seções distintas (dados gerais, endereço,
   permissões etc.) que não cabem juntas mesmo em grid largo, separe em
   abas dentro do próprio modal — não invente um componente de tabs novo
   nem instale biblioteca: reutilize o padrão nativo já usado em
   `frontend/src/modules/usuarios/pages/ColaboradoresAdminPage.tsx`
   (~linhas 462–520): `role="tablist"` / `role="tab"` com `aria-selected`,
   navegação por seta/Home/End, painéis com `role="tabpanel"` e
   `data-aba`/`hidden`, e `onInvalidCapture` no `<form>` para trocar de aba
   automaticamente se o campo inválido estiver numa aba escondida.
4. **Rolagem vertical é o último recurso, não o plano.** Ela só deve
   aparecer dentro do modal (`fitViewport`) quando o conteúdo de uma única
   aba realmente não cabe na altura da tela — nunca como substituto de
   dividir em colunas ou abas.

## Exemplo de referência

`frontend/src/modules/usuarios/pages/ColaboradoresAdminPage.tsx` é o
exemplo mais completo no repositório: `Dialog` com `max-w-5xl` +
`fitViewport`, campos em grid de até 3 colunas, e abas para separar dados
gerais de outras seções.

## Checklist

- [ ] O `Dialog` usa `max-w-*` compatível com o número de campos (não o
      padrão estreito) e `fitViewport` quando o conteúdo pode ser longo?
- [ ] Os campos estão em `grid` com múltiplas colunas, não empilhados em
      `flex flex-col`?
- [ ] Se não coube em grid largo, o formulário foi dividido em abas
      reutilizando o padrão de `ColaboradoresAdminPage.tsx`, em vez de só
      deixar rolar?
