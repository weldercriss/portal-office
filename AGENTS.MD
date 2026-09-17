# AGENTS.md — Regras gerais para qualquer IA neste repositório

Este arquivo segue a convenção [agents.md](https://agents.md): é o primeiro
documento que qualquer agente de IA (Claude Code, Cursor, Copilot, Codex
etc.) deve ler antes de mexer neste repositório. Regras específicas de uma
ferramenta vivem no arquivo próprio dela (ex.: `claude.md`); regras
específicas de uma área do código vivem em `AI/SKILLS/`. Este arquivo cobre
o que vale para **qualquer** agente, em **qualquer** parte do projeto.

## 1. Antes de começar qualquer tarefa

Antes de escrever a primeira linha de código ou plano, leia nesta ordem:

1. [AI/README.MD](AI/README.MD) — mapa da pasta `AI/`.
2. [AI/CONTEXT.md](AI/CONTEXT.md) — o que é o sistema, arquitetura, módulos,
   permissões, deploy. Se algo aqui parecer inconsistente com o código,
   **confie no código**.
3. [AI/TASKS.md](AI/TASKS.md) — pendências e tarefas em aberto.
4. `AI/SKILLS/<área>/` — antes de escrever ou revisar código de backend,
   banco, frontend ou testes, leia as micro skills da área correspondente
   (um arquivo por tema: estrutura de módulo, guards, migrations, TanStack
   Query etc.).

Para uma tarefa trivial (typo, texto, cor) os 4 passos são exagero — use
julgamento. Para qualquer coisa que toque arquitetura, regra de negócio ou
mais de um arquivo, os 4 passos não são opcionais.

## 2. Antes de considerar o trabalho terminado

Ao finalizar uma tarefa relevante (não um ajuste trivial de typo/cor/texto),
verifique nesta ordem:

1. **`AI/CONTEXT.md` mudou de verdade?** Se a tarefa alterou arquitetura,
   módulo, regra de permissão, fluxo de deploy ou qualquer outra coisa que
   esse arquivo descreve, atualize a seção correspondente.
2. **Alguma regra em `AGENTS.md`, `claude.md` ou `AI/SKILLS/<área>/` ficou
   errada ou incompleta?** Se a tarefa mudou um padrão de código, um comando
   ou uma convenção, atualize a skill correspondente (ou crie uma nova
   micro skill, se o tema ainda não tem uma). Regra desatualizada é pior do
   que regra ausente, porque engana em vez de só não ajudar.
3. **Registre um resumo em `AI/SESSIONS/<dd-mm-aaaa>.md`**: o que foi
   pedido, o que mudou, bugs encontrados e decisões tomadas.
4. **`AI/TASKS.md` reflete a pendência concluída ou criada?**

Os quatro passos são parte de terminar a tarefa, não um "extra" opcional —
não pule para o próximo pedido do usuário sem passar por eles.

## 3. Regras de arquitetura e produto

- **Nunca alterar banco de dados sem migration.** Sempre `prisma migrate
  dev` (schema novo) ou `prisma migrate deploy` (aplicar migrations
  existentes). Detalhes em
  [AI/SKILLS/DATABASE/migrations.md](AI/SKILLS/DATABASE/migrations.md).
- **Não usar `any` em TypeScript**, nem no backend nem no frontend.
- **Controllers só recebem requisições**; regra de negócio fica nos
  Services, que acessam o Prisma diretamente — este projeto não tem camada
  de Repository separada (ver
  [AI/SKILLS/BACKEND/acesso-a-dados.md](AI/SKILLS/BACKEND/acesso-a-dados.md)).
- **Reutilizar componentes e módulos existentes antes de criar novos.** Não
  instalar bibliotecas sem necessidade real.
- **Backend e frontend são dois projetos npm independentes** (`backend/` e
  `frontend/`, cada um com seu `package.json`/lockfile) — não há workspace
  na raiz coordenando os dois; rode `npm.cmd ci`/`npm.cmd install` dentro de
  cada pasta, não na raiz.
- **Os scripts de deploy em `scripts/` são Bash e rodam via WSL/Linux**,
  mesmo neste ambiente Windows — não tente adaptá-los para PowerShell. O
  Docker local (Compose de desenvolvimento) roda normalmente via Docker
  Desktop, sem exigir WSL.

## 4. Segurança e credenciais

- Nunca commitar segredos. Variáveis sensíveis (`DATABASE_URL`, segredos e
  expiração JWT, credenciais do Telegram, Google, chave de criptografia do
  refresh token da Agenda) vivem em `.env`, nunca hardcoded no código.
- Antes de `git add`, revise o que foi staged — se algo parecer um segredo
  mesmo em arquivo com nome inocente, confira o conteúdo antes de commitar
  ou dar push.

## 5. Padrões de código

`AI/SKILLS/<área>/` guarda **micro skills**: um arquivo markdown por tema
específico, não um único arquivo genérico por área. O conteúdo é adaptado à
stack real deste projeto — os exemplos usam código que já existe no
repositório, não teoria genérica. Uma skill nova sobre um tema ainda não
coberto é só mais um arquivo na pasta da área certa, sem precisar
reorganizar nada existente:

- `AI/SKILLS/BACKEND/` — NestJS: estrutura de módulo, guards de
  autenticação/autorização, acesso a dados via Prisma, validação de DTOs,
  uploads e o fluxo de subir a API localmente.
- `AI/SKILLS/DATABASE/` — Prisma + PostgreSQL: migrations, convenção de
  enums/estados, o modelo de identidade/permissões no schema, seeds e o
  banco local.
- `AI/SKILLS/FRONTEND/` — React: organização de módulo, TanStack Query,
  cliente HTTP centralizado, componentes/feedback (Dialog), permissões nas
  rotas, layout horizontal de telas/formulários (regra "tela-horizontal")
  e como rodar o frontend localmente.
- `AI/SKILLS/TESTING/` — Jest e Vitest/Testing Library: padrão de cada
  ferramenta, prioridades de cobertura e o checklist de fim de tarefa.

## 6. Idioma e estilo de resposta

Responda sempre em português. Documentação nova dentro de `AI/` também é
escrita em português, seguindo o tom já usado em `CONTEXT.md` e `TASKS.md`:
direto, técnico, com caminhos de arquivo reais em vez de descrições vagas.
