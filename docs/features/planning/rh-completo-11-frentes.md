# Plano: Módulo de RH completo — tempo de experiência, aniversariantes, admissão/demissão, documentos, pesquisas e feedback

Status em 18/09/2026: **as 11 frentes e a peça transversal (papel Gestor)
estão implementadas e testadas.** Foram três sessões: itens 5/6/7 em
17/09/2026; papel Gestor + itens 1/2/3/4/8/9 em 18/09/2026; itens 10/11 (e o
item 18 do plano geral, gerenciamento de documentos na Central, que não
fazia parte deste plano) na sequência, mesmo dia. Este documento **não é
mais o estado real** ponto a ponto — ele descreve o desenho original, usado
como referência de arquitetura; o texto de cada seção abaixo foi mantido
como registro de design, com uma nota de "implementado" ao final de cada
uma apontando o que mudou de fato na implementação. O estado corrente e o
detalhe de cada entrega vivem em
[TASKS.md item 17](../../../AI/TASKS.md#17-plano-de-rh-completo-11-frentes--planejamento-concluído-itens-5-6-e-7-implementados-em-17092026)
(e item 18, à parte) e nas sessões
[17-09-2026](../../../AI/SESSIONS/17-09-2026.md),
[18-09-2026](../../../AI/SESSIONS/18-09-2026.md) — confira esses arquivos
antes de assumir que algo aqui ainda está pendente.

## Contexto

O portal já cobria boa parte da operação de RH (cadastro de colaborador em
`User`, histórico profissional, checklist de admissão simples, documentos
por colaborador, dashboard com aniversariantes, convites de agenda em massa
com Google Meet, motor de formulário dinâmico em Solicitações, notificações
in-app + Telegram). O pedido do usuário foi fechar as lacunas que impedem o
RH de operar o ciclo completo do colaborador dentro do portal: quanto tempo
de experiência cada um tem (interna + anterior), quantos aniversariantes por
mês, avisar gestor direto e RH com antecedência configurável, um checklist
de admissão de verdade (com formulário público de pré-cadastro), uma
Central de Documentos navegável por departamento/colaborador/categoria,
contracheque por competência, dados de saúde/cultural no cadastro,
relatório de turnover com processo demissional, pesquisas anônimas de
NPS/NR-1 e feedback de 1:1.

Muitas dessas frentes se apoiam nas mesmas peças (motor de formulário
dinâmico de Solicitações, upload multer, `NotificacoesService`,
`convites-agenda`, o par `gestorId`/`subordinados` que já existe em `User`).
O plano generaliza modelos existentes em vez de criar paralelos sempre que
possível, e isola o que é genuinamente novo (papel Gestor, pesquisas
anônimas, relatório de turnover).

Decisões confirmadas com o usuário (não reabrir sem pedido explícito):
- **Papel Gestor vai virar uma role de verdade**, com acesso aos dados da
  própria equipe (não é só destinatário de notificação).
- **Pré-cadastro público cria o `User` automaticamente**, em um status novo
  "pendente autorização" — não fica ativo até o RH revisar e autorizar.
- **Pesquisas anônimas não têm piso mínimo de respostas** — mostram o
  agregado assim que houver 1 resposta.
- **Relatórios ganham gráfico de verdade** — `recharts` é dependência nova
  aprovada para o frontend, instalada em 18/09/2026 junto com o primeiro
  gráfico (aniversariantes por mês).

---

## Peça transversal — Papel GESTOR (escopo de equipe) — implementado em 18/09/2026

Pré-requisito conceitual de várias frentes abaixo (dashboard de equipe,
avisos ao gestor, visão da ficha dos liderados). Hoje `User.gestorId`/
`subordinados` já existe no schema mas é só informativo — sem efeito de
permissão.

**Schema**: adicionar `GESTOR` ao enum `Role` (`ADMIN | USER | MASTER` →
`ADMIN | USER | MASTER | GESTOR`), mesmo padrão de migration usado para
`MASTER` (`ALTER TYPE "Role" ADD VALUE`, numa migration própria, separada de
qualquer uso do valor na mesma transação — restrição do Postgres já
documentada em `AI/TASKS.md` item 16).

**Hierarquia**: estender `backend/src/auth/roles.util.ts`
(`satisfazRole`/`ehAdminOuSuperior`) com `USER(0) < GESTOR(1) < ADMIN(2) <
MASTER(3)` e um novo helper `ehGestorOuSuperior(role)`. Gestor **não**
satisfaz `@Roles('ADMIN')` — continua sem acesso a nada administrativo geral,
só ganha as rotas escopadas novas abaixo. Espelhar o mesmo helper no
frontend (`frontend/src/types/auth.types.ts`), como já existe para
`satisfazRole`.

**Escopo MVP (deliberadamente conservador, só leitura)**:
- `GET /dashboard/equipe` (`GESTOR`+): mesma lógica de `DashboardService`,
  filtrada a `gestorId = req.user.id` — aniversariantes da equipe, checklist
  de admissão pendente da equipe, total de liderados.
- `GET /users/minha-equipe` (`GESTOR`+): lista dos `subordinados` diretos
  (nome, cargo, avatar, status, e-mail) — sem salário/dados bancários.
- Nos módulos `historico-profissional`, `checklist` (item 4) e
  `documentos`: o helper de acesso self-or-admin que cada um já tem
  (`garantirAcesso`) ganha um terceiro caso — `GESTOR` acessa quando o
  `userId` alvo é um liderado direto (`subordinados`). Vale extrair esse
  helper duplicado por módulo para um único
  `backend/src/common/acesso-colaborador.util.ts`
  (`garantirAcessoColaborador(usuarioLogado, alvoId, subordinadosIds)`),
  reaproveitado pelos três.
- **Fora do escopo do MVP, deliberadamente**: dados sensíveis (item 8 —
  saúde/cultural), salário/benefícios/dados bancários e qualquer ação de
  escrita (editar cadastro, aprovar checklist) continuam exclusivos de
  `ADMIN`/`MASTER` mesmo para o gestor da pessoa — dado sensível demais pra
  abrir sem um pedido explícito. Também não é recursivo (só liderados
  diretos, não a árvore inteira abaixo do gestor) — mais simples e cobre o
  caso comum.

**Frontend**: `ProtectedRoute`/`AppShell`/`navigation.ts` ganham suporte a
`gestorOnly`/checagem de hierarquia (mesmo padrão já usado para
`masterOnly`). Novo módulo `frontend/src/modules/equipe/` com
`MinhaEquipePage.tsx` (rota `/minha-equipe`) reaproveitando `ListaResumo`,
`Card`, `PageShell`; dashboard do gestor reaproveita o layout de
`AdminDashboardPage.tsx` com os cards filtrados.

**Implementado como desenhado.** `Role.GESTOR`, hierarquia `USER < GESTOR <
ADMIN < MASTER` em `roles.util.ts`/`auth.types.ts`, e o helper de acesso
duplicado foi de fato extraído para
`backend/src/common/acesso-colaborador.util.ts`
(`garantirAcessoColaborador`), reaproveitado por `historico-profissional`,
`onboarding` (checklist) e `documentos`. `UsersService.findMinhaEquipe`
(`GET /users/minha-equipe`) e `DashboardService.getResumoEquipe` (`GET
/dashboard/equipe`) cobrem o escopo MVP só-leitura como desenhado. Frontend
em `frontend/src/modules/equipe/` (`MinhaEquipePage.tsx`, rota
`/minha-equipe`), item de menu `gestorOnly`. Escopo fora do MVP (dados
sensíveis, escrita, recursividade além de liderado direto) permanece
deliberadamente de fora, como planejado.

---

## Nova dependência de frontend — `recharts` — instalada e em uso desde 18/09/2026

Relatórios devem ter gráfico de verdade, não só tabela. `recharts` é a
escolha natural (padrão de fato para React + TS, composição declarativa, boa
acessibilidade, o projeto não tem nenhuma lib de gráfico hoje). Usado em:
- Item 2 — barras de aniversariantes por mês no dashboard.
- Item 9 — admissões × desligamentos por mês (turnover).
- Item 10 — % respondido e distribuição de respostas (NPS/NR-1).

Antes de implementar qualquer gráfico, carregar a skill `dataviz` do projeto
(paleta, acessibilidade, layout de dashboard) — já disponível no ambiente de
desenvolvimento.

---

## 1. Tempo de experiência profissional — implementado em 18/09/2026

**Schema**: generalizar `HistoricoProfissional` (não criar model novo) —
adicionar dois campos:
```prisma
model HistoricoProfissional {
  // ...campos atuais (cargo, departamento, dataInicio, dataFim, observacao)
  empresa  String?  // preenchido só quando externo=true
  externo  Boolean  @default(false)
}
```
`departamento` continua livre e só é relevante quando `externo=false`.

**Backend**: `backend/src/historico-profissional/dto/historico.dto.ts` ganha
`empresa?`/`externo?` opcionais. Sem mudança de rota ou de regra de acesso.

**Frontend**: aba "Histórico profissional" em `FichaColaboradorPage.tsx`
ganha um toggle "Nesta empresa / Empresa anterior" trocando o campo
"Departamento" por "Empresa". Tempo total de experiência é **calculado no
cliente**, sem endpoint novo: tenure interno
(`(User.dataDesligamento ?? hoje) − User.dataAdmissao`, ver item 9) somado à
soma de `(dataFim ?? hoje) − dataInicio` de todos os registros
`externo=true`. Novo util `colaboradores-rh/utils/tempoExperiencia.ts`.

**Implementado como desenhado**, incluindo o util com teste
(`tempoExperiencia.test.ts`) e o toggle Nesta empresa/Empresa anterior na
aba Histórico profissional da ficha do colaborador.

---

## 2. Dashboard — aniversariantes por mês — implementado em 18/09/2026

**Schema**: nenhuma mudança.

**Backend**: `DashboardService.getResumoAdmin()` já carrega todos os
colaboradores ativos com `dataNascimento` em memória. Adicionar mais uma
agregação sobre o **mesmo array**, sem query nova:
`aniversariantesPorMes: { mes: number; total: number }[]` (12 posições,
agrupado por `getUTCMonth()` — ano inteiro, ao contrário da janela de 60
dias do card "Próximos aniversários" que já existe e continua como está).

**Frontend**: novo card em `AdminDashboardPage.tsx` com um gráfico de barras
`recharts` (mês × quantidade), ao lado dos cards já existentes.

**Implementado como desenhado**: `aniversariantesPorMes` no
`getResumoAdmin`, gráfico `BarChart` em `AdminDashboardPage.tsx`.

---

## 3. Avisos de aniversário configuráveis (gestor direto + RH) — implementado em 18/09/2026

Hoje `AniversariosService` (`@Cron(EVERY_DAY_AT_8AM)`) já avisa quem tem
`recebeAvisosRH=true` com `DIAS_ALVO=[5,3,2,1]` fixo no código. Faltam duas
coisas: dias configuráveis pelo admin, e avisar também o **gestor direto**
do aniversariante (`User.gestorId`, já existe — não precisa da role nova da
peça transversal, é só seguir a relação).

**Schema**: model de configuração singleton, mesmo espírito de
`AgendamentoConfig`:
```prisma
model ConfigAvisoAniversario {
  id               String   @id @default("global")
  diasAntecedencia Int[]    @default([15, 10, 5, 3, 1])
  atualizadoEm     DateTime @updatedAt
}
```
(`Int[]` já é usado em `TipoPlantao.diasSemana`, não é técnica nova no
schema.)

**Backend**: estender o módulo `aniversarios` existente:
- `verificarAniversariosProximos()`: troca `DIAS_ALVO` fixo por leitura de
  `ConfigAvisoAniversario` (fallback ao array padrão se a linha não existir
  ainda). A query de colaboradores passa a incluir `gestorId`. Destinatários
  por colaborador = união de (usuários com `recebeAvisosRH=true`, como hoje)
  **+** `colaborador.gestorId` (se existir e for diferente do próprio
  aniversariante), dedup via `Set`.
- Novo controller pequeno no mesmo módulo: `GET/PATCH
  /configuracoes/avisos-aniversario` (`@Roles('ADMIN')`).

**Frontend**: nova página `AvisosAniversarioAdminPage.tsx`, rota
`/configuracoes/avisos-aniversario` dentro de `ConfiguracoesLayout` — chips
numéricos editáveis (adicionar/remover dias de antecedência), `PATCH` ao
salvar.

**Implementado como desenhado**: `ConfigAvisoAniversario` singleton,
destinatários unindo `recebeAvisosRH=true` + `gestorId` direto, tela de
chips em `frontend/src/modules/avisos-aniversario/`.

---

## 4. Checklist de admissão + pré-cadastro público — implementado em 18/09/2026

Combina três coisas: formulário público que já **cria o cadastro** (em
status pendente), um checklist categorizado com observações internas, e a
pesquisa de onboarding (que vive no motor de pesquisas do item 10).

### 4.1 Pré-cadastro público que cria o `User`

Reaproveita o motor de formulário dinâmico já maduro de
`TipoSolicitacao`/`Solicitacao`/`formulario-publico.controller.ts` (link
público sem login, upload de arquivo por campo) em vez de construir um
segundo motor do zero — mas com uma extensão pontual: dois campos do
formulário podem ser marcados como identidade, para o backend criar o
cadastro de verdade ao receber a resposta.

**Schema**:
```prisma
enum StatusColaborador {
  ATIVO
  AFASTADO
  FERIAS
  DESLIGADO
  PENDENTE   // novo: pré-cadastro aguardando autorização do RH
}

model TipoSolicitacao {
  // ...campos atuais
  ehPreAdmissao Boolean @default(false)
}
```
`camposFormulario` (Json já existente) ganha uma chave opcional por campo:
`mapeamento?: 'NOME' | 'EMAIL'` — só usada quando `ehPreAdmissao=true`,
editável no mesmo `CamposFormularioEditor.tsx` (um select "Usar como" que só
aparece nesse tipo de formulário).

**Backend** (`formulario-publico.controller.ts`/service): ao receber uma
resposta para um `TipoSolicitacao` com `ehPreAdmissao=true`:
1. Extrai `nome`/`email` das respostas pelos campos marcados com
   `mapeamento`. Sem os dois campos configurados, a criação do tipo é
   bloqueada na tela de admin (validação simples).
2. Valida e-mail (formato + unicidade em `User.email`) — erro amigável no
   próprio formulário público se já existir, sem vazar detalhe do cadastro
   existente.
3. Cria o `User` numa transação: `nome`, `email`, `senhaHash` placeholder
   (mesma técnica já usada para contas provisionadas sem senha local via
   Google), `acessoPlataforma=false`, `statusColaborador=PENDENTE`,
   `role=USER`.
4. Cria a `Solicitacao` normalmente, mas agora com `userId` preenchido
   (deixa de ser anônima só para esse tipo — o restante do fluxo de
   Solicitações não muda).
5. Copia cada resposta tipo `ARQUIVO` para `DocumentoColaborador` (copiando
   o arquivo de `uploads/solicitacoes` para `uploads/documentos`, usando
   uma categoria de `CategoriaDocumento` já existente, ex. "Documentação de
   admissão" — módulo `categorias-documento` já implementado, ver seção 5).
6. Gera o checklist padrão de admissão (`gerarPadrao(userId, 'ADMISSAO')`,
   ver 4.2).

**Revisão pelo RH**: `ColaboradoresAdminPage.tsx` ganha um filtro/aba
"Pendentes de autorização" (`statusColaborador=PENDENTE`) separado da lista
principal. O admin abre a ficha, completa os campos que só ele preenche
(cargo, departamento, data de admissão, salário etc.), confere
documentos/checklist, e finaliza mudando `statusColaborador: PENDENTE →
ATIVO` (e `acessoPlataforma` se for o caso) — é a "autorização". Rejeitar um
pré-cadastro é simplesmente excluir o `User`.

**Importante**: listagens/contagens existentes que hoje filtram por `ativo`
(dashboard, cron de aniversário, relatório de turnover, e o **`GET
/documentos/resumo` da Central de Documentos, já implementado** — ver
`backend/src/documentos/documentos.service.ts#findResumo`, que já tem um
`TODO` marcado para isso) devem também excluir `statusColaborador=PENDENTE`
do quadro "ativo" quando esse status existir.

### 4.2 Checklist categorizado com observação interna

**Schema**: generalizar `ChecklistAdmissaoItem` → `ChecklistItem` (mesma
forma, três campos a mais):
```prisma
enum TipoChecklist { ADMISSAO DESLIGAMENTO }

model ChecklistItem {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tipo              TipoChecklist @default(ADMISSAO)
  categoria         String?    // "Documentação", "Exame Admissional", "Apresentação da empresa", "Onboarding"...
  titulo            String
  status            StatusChecklistItem @default(PENDENTE)
  observacaoInterna String?    // nunca retornado pro colaborador comum
  concluidoEm       DateTime?
  criadoEm          DateTime  @default(now())
}
```
Migration com dados: renomear tabela, adicionar colunas, backfill
`tipo='ADMISSAO'` nos registros existentes. `categoria` fica texto livre
(sem tabela de configuração à parte, ao contrário de `CategoriaDocumento`) —
o pedido aqui é agrupar por etapa do processo, não ter um catálogo
administrável.

**Backend**: `backend/src/onboarding/` (mantém o nome do módulo, troca o
model por dentro — rota HTTP `/colaboradores/:userId/checklist` não muda):
- `findAll` aceita `?tipo=ADMISSAO|DESLIGAMENTO`; quando quem chama não é
  `ADMIN`/`MASTER` (inclusive quando é o `GESTOR` da peça transversal),
  omite `observacaoInterna` da resposta.
- `ITENS_CHECKLIST_ADMISSAO_PADRAO` (a lista atual de 7 itens, agora com
  `categoria` em cada um) e `ITENS_CHECKLIST_DESLIGAMENTO_PADRAO` (novo, ver
  item 9).

**Frontend**: `SecaoChecklist` em `FichaColaboradorPage.tsx` — toggle
Admissão/Desligamento, agrupamento por `categoria` (client-side), e — só
para quem tem `ADMIN`/`MASTER` — um campo de observação interna por item. A
"pesquisa de satisfação de onboarding" citada na categoria Onboarding não é
uma feature própria: é um item do checklist cujo "concluído" o RH marca
manualmente depois de ver a `Pesquisa` (item 10) do tipo onboarding
respondida.

**Implementado como desenhado, nas duas partes.** 4.1: pré-cadastro público
cria o `User` em `PENDENTE` a partir do `mapeamento` NOME/EMAIL nos campos
do formulário, com as 3 telas (seletor "Usar como" em
`CamposFormularioEditor`, checkbox "É um pré-cadastro" em
`TiposSolicitacaoAdminPage.tsx`, filtro "Pendentes de autorização" em
`ColaboradoresAdminPage.tsx`) e a correção de um bug real encontrado no
caminho (o guard de upload do formulário público checava `userId`, que
quebrava justamente o pré-cadastro — trocado para `registradoPorId`, a
distinção correta entre "resposta pública" e "resposta autenticada"). 4.2:
`ChecklistAdmissaoItem` generalizado para `ChecklistItem`/`TipoChecklist`
como desenhado, com `categoria` e `observacaoInterna`.

---

## 5. Central de Documentos (categorias configuráveis + árvore) — implementado em 17/09/2026, com upload/exclusão inline em 18/09/2026 (item 18)

Implementado como desenhado. `CategoriaDocumento` (tabela configurável,
substitui o enum `TipoDocumentoColaborador`), CRUD em
`backend/src/categorias-documento/` (`ADMIN`, rota
`/configuracoes/categorias-documento`). `GET /documentos/resumo`
(`backend/src/documentos/documentos.controller.ts`,
`DocumentosResumoController`) alimenta `CentralDocumentosPage.tsx`
(`frontend/src/modules/central-documentos/`, rota `/central-documentos`),
navegação Departamento → Colaborador (com foto) → Categoria → arquivo, sem
endpoint agregado de documentos por colaborador (reaproveita `GET
/colaboradores/:userId/documentos` já existente).

Colaborador solicitar atualização de documento (citado no pedido original)
**não foi implementado** — o desenho recomendado é reaproveitar
Solicitações: o admin cria um `TipoSolicitacao` "Atualização de documento"
(campo texto + campo `ARQUIVO`), o colaborador já consegue abrir isso pela
tela `/solicitacoes` que já existe hoje. RH substitui o documento manualmente
na Central após aprovar. Zero backend novo necessário; só falta criar esse
`TipoSolicitacao` (dado de configuração, não código) e, opcionalmente, um
atalho de UX na aba Documentos linkando direto pra essa solicitação
pré-selecionada.

Detalhe completo da implementação em
[SESSIONS/17-09-2026.md](../../../AI/SESSIONS/17-09-2026.md#plano-de-rh-completo-11-frentes--planejamento-e-início-da-implementação-foto-de-perfil--central-de-documentos--contracheque).

**Item 18 (fora deste plano, pedido novo de 18/09/2026):** a Central ganhou
upload e exclusão de documento direto na própria tela (`UploadDocumentoForm`
+ botão de excluir em `CentralDocumentosPage.tsx`), reaproveitando as
mesmas rotas/hooks já usados na ficha do colaborador — sem endpoint novo.
"Colaborador solicitar atualização de documento" (parágrafo acima) continua
**não implementado**, é um pedido diferente do item 18.

---

## 6. Foto de perfil configurável — implementado em 17/09/2026

Implementado como desenhado: `User.avatarCaminho`/`avatarMimeType`, módulo
`backend/src/avatar/` (`avatar.storage.ts` restrito a JPG/PNG de até 5MB,
`POST /colaboradores/:userId/avatar` `ADMIN`, `GET` no mesmo caminho
**deliberadamente público/sem guard** — decisão tomada durante a
implementação, não estava no plano original: a UI usa `<img src>` direto em
várias telas e uma tag `<img>` não manda o header `Authorization` que a API
normalmente exige; mesma exposição que a foto do Google já tinha por ser uma
URL pública). Frontend: `frontend/src/lib/avatarUrl.ts` resolve tanto a URL
absoluta do Google quanto o caminho relativo do upload local antes de
qualquer `<img src>` — usado em `UserDropdown.tsx`, `FichaColaboradorPage.tsx`,
`ColaboradoresAdminPage.tsx` e `CentralDocumentosPage.tsx`.

---

## 7. Contracheque por competência — implementado em 17/09/2026

Implementado como desenhado: `DocumentoColaborador.competencia`, sub-aba
"Contracheque" dentro de Documentos na ficha do colaborador
(`frontend/src/modules/colaboradores-rh/utils/competencia.ts`, agrupamento
client-side por mês/ano, sem endpoint novo). Filtra pela categoria de nome
exato "Holerite" — **acoplamento deliberado por nome, sem flag própria no
schema**: renomear essa categoria pela tela de administração quebra o
agrupamento e o campo de competência condicional no formulário de upload.
Se isso incomodar no futuro, a correção é uma coluna `CategoriaDocumento.
ehHolerite Boolean @default(false)` (mesmo padrão de `TipoSolicitacao.
ehPreAdmissao` do item 4) em vez do nome exato.

---

## 8. Dados de saúde e perfil cultural — implementado em 18/09/2026

**Schema**: campos nullable direto em `User` (mesmo padrão de
`salario`/`beneficios`/`bancoNome`, que já são dado sensível solto no
`User`):
```prisma
tipoSanguineo     String?
alergias          String?
condicoesSaude    String?
beneficioCultural String?
```
Nenhum campo de "perfil comportamental" agora — é citado como futuro
explicitamente; não bloqueia nada, é só mais uma coluna nullable quando
existir.

**Exposição (LGPD)**: **não** entram no `SELECT_PUBLICO` usado por
`findAll`/`findOne`/`findMe` (evita vazar em toda tela que lista
colaboradores). Endpoint dedicado `GET/PATCH
/colaboradores/:userId/dados-sensiveis`, novo módulo pequeno
`dados-sensiveis`, acesso **só** self-or-admin — **o Gestor não entra aqui**
mesmo tendo acesso de equipe (dado sensível demais pra abrir sem pedido).

**Frontend**: nova aba "Saúde e cultura" em `FichaColaboradorPage.tsx` —
select de tipo sanguíneo, textareas para alergias/condições/benefício
cultural.

**Implementado como desenhado**: campos nullable em `User`, módulo
`dados-sensiveis/` self-or-admin (Gestor de fora, como planejado), sub-aba
`SecaoSaude` na ficha do colaborador.

---

## 9. Turnover + processo demissional — implementado em 18/09/2026

**Schema**: `User` ganha `dataDesligamento DateTime?` e `motivoDesligamento
String?` (texto livre).

**Backend — captura automática**: em `UsersService.update()`, o branch que
já existe hoje (detecta virada pra `DESLIGADO` e chama
`alocacoesService.devolverTudoDoColaborador`) ganha:
1. Se o DTO não trouxer `dataDesligamento` explícito, grava `new Date()` no
   momento da virada (permite desligamento retroativo se o admin informar
   uma data).
2. Chama `checklistService.gerarPadrao(id, 'DESLIGAMENTO')` (reaproveita o
   `ChecklistItem` generalizado do item 4.2) — itens padrão: "Devolução de
   patrimônio", "Exame demissional", "Acerto de contas", "Entrevista de
   desligamento", "Revogação de acessos".

**Relatório de turnover — módulo novo `relatorios`**:
- `GET /relatorios/turnover?de=AAAA-MM&ate=AAAA-MM&departamentoId=`
  (`@Roles('ADMIN')`, sem `RotinaGuard` — mesmo padrão simples de
  `convites-agenda`/`patrimonio-tipos`).
- Service carrega em memória os `User` com `dataAdmissao` ou
  `dataDesligamento` no intervalo, agrupa por mês →
  `{ mes, admissoes, desligamentos }`.
- Frontend: novo módulo `relatorios`, página `TurnoverAdminPage.tsx` — filtro
  de período/departamento + gráfico `recharts` (barras agrupadas
  admissões/desligamentos por mês) + tabela de apoio.

**Implementado como desenhado**: captura automática de
`dataDesligamento`/checklist de desligamento em `UsersService.update`,
módulo `backend/src/relatorios/` (`getTurnover`) + `TurnoverAdminPage.tsx`
com gráfico `recharts`.

---

## 10. Pesquisas anônimas (NPS / NR-1) — implementado em 18/09/2026

Não reaproveita `Solicitacao` diretamente (ela é ligada a `userId`/status
por pessoa — o oposto de anonimato), mas reaproveita o **formato de campos
dinâmicos** já usado em `TipoSolicitacao.camposFormulario` e os
**componentes de frontend** que sabem editar/renderizar esse formato
(`CamposFormularioEditor.tsx` para o admin montar perguntas,
`CamposFormularioForm.tsx` para renderizar a resposta).

**Schema — duas tabelas sem FK entre si, de propósito** (é isso que garante
que nem uma query consiga religar quem respondeu o quê):
```prisma
enum PesquisaTipo { NPS NR1 FEEDBACK_1_1 GERAL }

model Pesquisa {
  id          String   @id @default(uuid())
  titulo      String
  descricao   String?
  tipo        PesquisaTipo
  ativa       Boolean  @default(true)
  campos      Json     // mesmo formato de TipoSolicitacao.camposFormulario
  criadoPorId String
  criadoPor   User     @relation(fields: [criadoPorId], references: [id])
  criadoEm    DateTime @default(now())
  convites    PesquisaConvite[]
  respostas   PesquisaResposta[]
}

model PesquisaConvite {
  id          String    @id @default(uuid())
  pesquisaId  String
  pesquisa    Pesquisa  @relation(fields: [pesquisaId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  convidadoEm DateTime  @default(now())
  respondeuEm DateTime? // só SE respondeu — nunca o conteúdo
  @@unique([pesquisaId, userId])
}

model PesquisaResposta {
  id         String   @id @default(uuid())
  pesquisaId String
  pesquisa   Pesquisa @relation(fields: [pesquisaId], references: [id], onDelete: Cascade)
  respostas  Json     // { [campoId]: valor }, mesmo formato de Solicitacao.respostasFormulario
  criadoEm   DateTime @default(now())
  // de propósito SEM userId e sem FK de volta a PesquisaConvite
}
```

**Backend**, novo módulo `pesquisas`:
- `POST /pesquisas` (`ADMIN`+): define `campos`, `tipo`, destinatários
  (lista de `userId` **ou** `{ gestorId }` para expandir `subordinados`
  automaticamente); cria `Pesquisa` + `PesquisaConvite` em massa numa
  transação (mesmo padrão transacional de `ConvitesAgendaService.criar`).
- `GET /pesquisas/:id` (`ADMIN`+): retorna `% respondeu`
  (`respondeuEm != null` vs total de convites, **sem piso mínimo** —
  confirmado com o usuário) e respostas agregadas (campos
  `SELECAO`/`NUMERO`: contagem/média por opção; `TEXTO`: lista solta de
  textos, sem vínculo a quem enviou). Gráfico `recharts` para % respondido e
  distribuição.
- `GET /pesquisas/pendentes` (autenticado): pesquisas com convite do próprio
  usuário e `respondeuEm=null`.
- `POST /pesquisas/:id/responder` (autenticado): numa transação, cria
  `PesquisaResposta` (sem `userId`) e marca `PesquisaConvite.respondeuEm =
  now()` — duas escritas na mesma transação, sem FK cruzada entre as duas
  tabelas.
- Aviso de disponibilidade: reaproveita `NotificacoesService.criar()`
  (in-app + Telegram automático) para cada convidado.
- **Lembrete na agenda**: reaproveita `convites-agenda` **sem modificá-lo**
  — ao terminar de criar os convites, a tela oferece um botão "Criar
  lembrete na agenda" que leva pra `/convites-agenda` com os e-mails dos
  convidados pré-preenchidos (querystring/estado de navegação).

**Frontend**: novo módulo `pesquisas` — `PesquisasAdminPage.tsx` (lista +
criar, reaproveitando `CamposFormularioEditor`), `PesquisaResultadoPage.tsx`
(agregados + gráfico), e um widget "Pesquisas pendentes" no dashboard/perfil
que renderiza com `CamposFormularioForm`.

**Implementado com o schema e o motor exatamente como desenhado, com
algumas diferenças de superfície/escopo em relação a este texto:**
- `GET /pesquisas/:id/resultado` em vez de `GET /pesquisas/:id` (evita
  colisão de rota com `GET /pesquisas/pendentes` no Nest, que casa por
  ordem de declaração).
- **Sem suporte a campo `ARQUIVO`** — cortado deliberadamente: o
  `CampoFormularioDto` é o mesmo de `TipoSolicitacao`, mas o service
  rejeita a criação se algum campo vier `ARQUIVO`
  (`CamposFormularioEditor` ganhou a prop `tiposPermitidos` pra nem
  oferecer a opção na tela de pesquisas). Upload de arquivo numa pesquisa
  anônima exigiria o mesmo fluxo de multipart de Solicitações sem um caso
  de uso real pra NPS/NR-1/feedback 1:1.
- **Sem widget "Pesquisas pendentes" no dashboard/perfil** — em vez disso,
  uma página própria `PesquisasPage.tsx` (rota `/pesquisas`, mesmo padrão
  admin/colaborador de `/solicitacoes`) lista as pendências e abre o
  diálogo de resposta; item **Pesquisas** no menu, visível a qualquer
  autenticado.
- **Sem o botão "Criar lembrete na agenda"** que reaproveitaria
  `convites-agenda` — não implementado nesta v1, ninguém pediu
  explicitamente.
- `validarRespostasContraCampos` (antes privado em `SolicitacoesService`)
  foi extraído para `backend/src/common/campo-formulario.util.ts` e
  reaproveitado pelos dois módulos, em vez de duplicado.
- `CamposFormularioEditor`/`CamposFormularioForm` foram promovidos de
  dentro de `tipos-solicitacao/`/`solicitacoes/` para
  `frontend/src/components/system/` — pesquisas foi o segundo módulo a
  usá-los, cruzando o limite que `AI/SKILLS/FRONTEND/organizacao-de-modulo.md`
  documenta como gatilho pra promoção em vez de import cruzado.

---

## 11. Feedback de 1:1 / gestão — implementado em 18/09/2026

Reaproveita 100% o motor do item 10 — não vale a pena um modelo dedicado só
pra isso. A única diferença real é `tipo=FEEDBACK_1_1` e o público-alvo
resolvido automaticamente a partir de `User.gestorId`/`subordinados`: ao
criar uma `Pesquisa` com `tipo=FEEDBACK_1_1` e destinatário `{ gestorId }`
(em vez de lista manual de `userId`), o backend expande para os
`subordinados` daquele gestor no momento da criação (snapshot). Nenhuma
peça de schema/backend/frontend nova além do que já foi desenhado no item
10.

**Implementado exatamente como desenhado** — reaproveita 100% o motor do
item 10, sem nenhuma peça própria: `destinatarios: { gestorId }` na criação
já cobre o caso, testado em `pesquisas.service.spec.ts`.

---

## Fases sugeridas (ordem original — a implementação real seguiu a preferência do usuário, itens 5/6/7 primeiro) — todas concluídas

Ordem real de entrega: itens 5/6/7 em 17/09/2026; papel Gestor + itens
1/2/3/8/9 em 18/09/2026; item 4 (as 3 telas que faltavam) ainda em
18/09/2026; itens 10/11 na sequência, mesmo dia — não seguiu a ordem de
fases abaixo, mas cobriu as mesmas frentes.

**Fase 1 — Fundação transversal**: papel `GESTOR`, `recharts`, item 1
(histórico + experiência externa), item 6 (upload de foto), item 8 (dados
de saúde/cultural), item 9 parte 1 (campos de desligamento). **Concluída.**

**Fase 2 — Dashboard e avisos**: item 2 (aniversariantes por mês), item 3
(avisos configuráveis + gestor direto). **Concluída.**

**Fase 3 — Documentos**: item 5 (Central de Documentos), item 7
(contracheque). **Concluída** (item 5 ganhou upload/exclusão inline depois,
item 18 do plano geral, fora deste documento).

**Fase 4 — Jornada admissão/desligamento**: item 4 (checklist unificado +
pré-cadastro público), item 9 parte 2 (checklist de desligamento + relatório
de turnover). **Concluída.**

**Fase 5 — Pesquisas**: item 10 (motor de pesquisas anônimas), item 11
(feedback 1:1). **Concluída.**
