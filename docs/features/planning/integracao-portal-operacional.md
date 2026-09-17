# Plano: integração com o Portal Operacional (cs-dash)

Status: **planejamento, nada implementado**. Levantamento feito em 16/09/2026 lendo o
código dos dois repositórios (`portal-backoffice` e `../portal`, o cs-dash). Escopo de
dados ainda não decidido — ver seção 3.

## 1. Contexto e objetivo

O usuário pediu uma forma de trocar dados entre este portal (RH/operação interna da
Suri) e o **Portal Operacional**, que é o repositório irmão `../portal` (nome interno
`cs-dash`), plataforma de Customer Success da Suri. O cs-dash já expõe uma Public API
autenticada por API Key — é ela que este plano usa como ponte, nos dois sentidos:
levar dado deste portal pra lá (push) e trazer dado de lá pra cá (pull).

Padrão de sincronização pedido: **tempo real, no estilo webhook**. A seção 4 mostra até
onde isso é possível hoje sem mexer no cs-dash, e o que exigiria mudança lá também.

## 2. O que já existe hoje

### 2.1 cs-dash — a ponte já existe, mas é só de entrada (pull)

- **Public API REST** em `/public/v1/{recurso}`, código em
  `portal/backend-ts/src/modules/ops/public-api/`. Recursos disponíveis hoje:
  `companies`, `contracts`, `services` (só leitura), `tickets` (sem delete).
- **Autenticação por API Key**, não sessão: header `X-API-Key: csdash_<token>`
  (`portal/backend-ts/src/middleware/auth/apiKeyAuthMiddleware.ts`). A chave é
  hasheada (SHA-256) e cacheada 30s em processo; revogação leva até 30s pra valer.
- **Escopos por chave** (`portal/backend-ts/src/data/api-keys/api-keys.model.ts`):
  `companies:read`, `companies:write`, `companies:delete`, `tickets:read`,
  `tickets:write`, `contracts:read`, `contracts:write`, `services:read`. Uma chave só
  enxerga os escopos que o admin marcou na criação.
- **Rate limit por chave** (`windowMs`/`maxRequests` configurável), **allowlist de IP**
  opcional, **expiração** opcional.
- **Idempotency-Key** suportado em escrita (`apiIdempotency.ts`) — evita duplicar
  recurso em retry por timeout.
- **Log de uso por chave**, visível na tela administrativa (`api_request_logs`) —
  útil pra depurar o que este portal está mandando/puxando.
- **Gestão da chave é 100% manual, via UI admin do cs-dash**: `Configurações > API
  Keys` (`portal/frontend/app-portal-ops/src/modules/api-keys/`), rota
  `POST/GET/PATCH/DELETE /api-keys` protegida por sessão `ADMIN` — não existe
  self-service nem chave gerada por código.
- **Não existe emissor de webhook hoje.** Houve uma feature de webhooks no cs-dash;
  foi descontinuada (migrations `20260717_..._webhooks_*` e
  `20260804_001_drop_webhooks_orphan_collections.mongo.ts` dropam as coleções
  órfãs). O único webhook ativo no cs-dash é de **entrada**, em
  `portal/integrações/` (Jestor → Public API interna), não tem relação com este
  plano. **Consequência direta:** o cs-dash não consegue empurrar evento pra cá em
  tempo real sem que alguém implemente um emissor de webhook lá — isso é trabalho no
  outro repositório, fora do que dá pra decidir só por aqui.

### 2.2 Portal BackOffice — nenhuma integração com o cs-dash hoje

Não há nenhuma referência ao cs-dash neste repositório (busca por "cs-dash" e "portal"
não trouxe nada relevante em `AI/`). O que já existe e serve de modelo pra construir
essa integração:

- **Chamada HTTP a API externa usa `fetch` nativo**, sem lib nova — ver
  `backend/src/telegram/telegram.service.ts` (chamada à API do Telegram). Não há
  `axios` nem `node-fetch` no `package.json` do backend; Node 22 já tem `fetch`
  global. Ladder do ponytail bate: não precisa instalar nada.
- **Webhook de entrada com segredo na própria URL** já existe: `TelegramController`
  expõe `POST /telegram/webhook/:secret`
  (`backend/src/telegram/telegram.controller.ts:106`), compara com
  `process.env.TELEGRAM_WEBHOOK_SECRET` e responde `403` se não bater — rota sem
  `JwtAuthGuard`, fora da autenticação de sessão. É o modelo pronto pra um endpoint
  de entrada vindo do cs-dash, se/quando ele tiver emissor de webhook.
- **Entrega confiável assíncrona (outbox + worker) já existe**: `AgendaSyncPendente`
  + `AgendaGoogleWorker` (`backend/src/agenda-google/agenda-google.worker.ts`) —
  tabela de pendências no Postgres, `@Cron(CronExpression.EVERY_MINUTE)`, backoff
  exponencial (`2 ** tentativas`, teto 60min) e `MAX_TENTATIVAS`. É o padrão certo
  pra não perder dado se o cs-dash estiver fora do ar na hora do push.
- **Efeito colateral entre módulos é chamada direta de serviço**, não bus de eventos
  — não há `@nestjs/event-emitter` instalado. Ex.: desligar um colaborador aciona a
  devolução de patrimônio chamando o serviço direto
  (`CONTEXT.md` seção Patrimônio). O push pro cs-dash deve seguir o mesmo padrão:
  o serviço que já existe (ex. `UsersService`) chama o serviço de integração depois
  de salvar, sem um barramento novo no meio.

## 3. Decisão em aberto: qual dado sincronizar

Este é o ponto que trava qualquer implementação e **não foi decidido ainda** (resposta
do usuário: "ainda não sei o dado exato"). Vale registrar por quê não é trivial:

Os dois sistemas cobrem domínios diferentes. O cs-dash expõe só `companies`,
`contracts`, `services` e `tickets` — dados de clientes da Suri. Este portal cobre
colaboradores, departamentos, plantões, solicitações e patrimônio — dados internos de
RH/operação. **Não existe hoje um par de entidades óbvio entre os dois lados**: o
backoffice não tem "empresa cliente" nem "contrato", e o cs-dash não expõe nenhum
recurso de colaborador/agente interno (o campo mais próximo é `PublicTicketDto.openedBy`
— só texto livre `{ name, email }`, sem vínculo a um ID real).

Hipóteses possíveis para destravar essa decisão (nenhuma implementada, é só pauta pra
próxima conversa):

| Hipótese | Sentido | Precisa mexer no cs-dash? |
| --- | --- | --- |
| Ticket interno vira ticket do cs-dash (ex.: uma solicitação que também é um chamado de cliente) | push | Não — usa `POST /public/v1/tickets` como está |
| Cadastro de empresa/contrato feito por outro sistema aparece pro backoffice, só leitura (relatório administrativo) | pull | Não — usa `GET /public/v1/companies`/`contracts` como está |
| Colaborador do backoffice vira "responsável"/"agente" identificável em tickets/contratos do cs-dash | push | **Sim** — a Public API não tem esse recurso hoje |
| cs-dash notifica este portal em tempo real quando algo muda (qualquer recurso) | pull, tempo real | **Sim** — precisa de emissor de webhook no cs-dash, que foi removido |

A arquitetura da seção 4 não depende de qual linha da tabela for escolhida — o cliente
HTTP, a fila de retry e o endpoint de entrada são genéricos. Só o mapeamento de campos
e o gatilho (qual evento do backoffice dispara o push) mudam por hipótese.

## 4. Arquitetura proposta

### 4.1 Cliente HTTP único (`PortalApiClient`)

Um serviço NestJS único encapsula toda chamada ao cs-dash:

```
backend/src/integracao-portal/portal-api.client.ts
```

- `fetch` nativo, base URL e API Key vindas de env (`PORTAL_API_BASE_URL`,
  `PORTAL_API_KEY`).
- Um método por recurso/operação necessária (ex. `criarTicket`, `listarCompanies`),
  não um `request()` genérico exposto pro resto do app — mantém o ponto de mudança
  de contrato num lugar só, como `GoogleCalendarClient` já faz pra Agenda Google.
  Skip: um SDK completo dos 4 recursos da Public API — YAGNI até a hipótese da
  seção 3 escolher quais operações realmente são usadas.
- Envia `Idempotency-Key` (UUID por tentativa lógica, não por HTTP retry) em toda
  escrita — o cs-dash já suporta e evita duplicar registro se o worker reenviar.
- Trata `401/403` (chave revogada/sem escopo) como erro definitivo, não retry —
  loga e para a fila, porque insistir não resolve (mesmo racional do
  `RAZOES_SEM_AUTORIZACAO` em `google-calendar.client.ts`).
- Trata `429` (rate limit do cs-dash) e `5xx` como retry — cai na fila do worker
  (4.2).

### 4.2 Sentido BackOffice → Portal (push) — real "tempo real" hoje

Esse sentido não depende de nada novo no cs-dash: é o backoffice chamando a Public
API que já existe. Fica genuinamente em tempo real.

1. O serviço de domínio que originou o evento (ex. `UsersService`, `PlantoesService`
   — depende da hipótese escolhida) grava uma linha em `PortalSyncPendente`
   (Postgres, mesma forma de `AgendaSyncPendente`: payload, tipo de operação,
   tentativas, próxima tentativa) **na mesma transação** do dado que originou o
   evento — não perde a pendência se o processo cair logo depois.
2. Um `PortalSyncWorker` (`@Cron(CronExpression.EVERY_MINUTE)`, mesmo padrão do
   `AgendaGoogleWorker`) tenta entregar pendências imediatamente na próxima
   varredura — na prática, near-real-time (até 1 min de atraso), não um `await`
   síncrono no meio da requisição do usuário. Síncrono ficaria mais "tempo real"
   ainda, mas acopla a resposta do backoffice à disponibilidade do cs-dash — troca
   ruim pra uma operação que o usuário não está esperando na tela.
3. Sucesso apaga a pendência; falha reagenda com backoff, até `MAX_TENTATIVAS`.

### 4.3 Sentido Portal → BackOffice (pull) — dois caminhos, escolha depende do apetite de mexer no cs-dash

**Caminho A — recomendado pra começar: polling agendado.** Um segundo `@Cron` no
mesmo `PortalSyncWorker` chama `GET /public/v1/{recurso}` periodicamente (ex. a cada
5 minutos, filtrando por `updatedAt` desde a última execução) e aplica as mudanças
localmente. Não toca no cs-dash, entrega em minutos, não em tempo real. É o caminho
que dá pra implementar só com o que já existe hoje.

**Caminho B — webhook real, exige trabalho nos dois repositórios.** Só funciona se o
cs-dash ganhar de volta um emissor de webhook (feature que foi removida — seção 2.1).
Do lado do backoffice, o receptor já tem modelo pronto: `POST
/integracao-portal/webhook/:secret`, mesmo formato do
`TelegramController.webhook()` (segredo na URL, comparado a
`PORTAL_WEBHOOK_SECRET`, sem `JwtAuthGuard`). Do lado do cs-dash, precisaria de um
módulo novo que, a cada mutação relevante, faz `POST` nesse endpoint — arquitetura
nova lá, não decidida neste documento porque este plano não é dono daquele
repositório.

Recomendação: implementar o Caminho A primeiro. Reavaliar o Caminho B só depois que a
hipótese da seção 3 estiver validada em produção com o Caminho A — evita construir um
emissor de webhook no cs-dash para um dado que pode nem ser o escolhido.

## 5. Segurança e credenciais

- `PORTAL_API_KEY` e `PORTAL_WEBHOOK_SECRET` vão em `backend/.env`, nunca
  commitadas — mesma regra de `AGENTS.md` seção 4. `backend/.env.example` ganha as
  duas entradas comentadas, no mesmo formato de `TELEGRAM_WEBHOOK_SECRET` (como
  gerar com `node -e "require('crypto').randomBytes(32)...")`.
- A chave é gerada manualmente na UI do cs-dash (`Configurações > API Keys`), com só
  os escopos necessários pra hipótese escolhida (ex. só `tickets:write`, não os 8
  escopos) — menor privilégio possível, escopo largo demais é risco sem ganho.
- `allowedIps` da chave: preencher com o IP de saída do backend deste portal em
  produção, se for estável (reduz ainda mais o raio de dano de uma chave vazada).
- Flag `PORTAL_INTEGRATION_ENABLED` (mesmo padrão de `GOOGLE_CALENDAR_ENABLED`) —
  desligada por padrão, liga só depois de configurar a chave.

## 6. Estrutura de módulo proposta

```
backend/src/integracao-portal/
  integracao-portal.module.ts
  portal-api.client.ts        # 4.1 — único ponto que fala com a Public API do cs-dash
  portal-sync.worker.ts       # 4.2/4.3 — @Cron de push e pull
  portal-sync.service.ts      # regra de negócio: o que virar payload, o que aplicar do pull
  portal-integration.controller.ts  # 4.3 Caminho B, só se/quando existir
```

Registrar em `app.module.ts` junto dos demais (`AgendaGoogleModule`,
`TelegramModule` já mostram o padrão). Migration nova só para `PortalSyncPendente`
(mesma forma de `AgendaSyncPendente`).

## 7. Fases de entrega

1. **Fase 0 — decidir o dado** (seção 3). Sem isso, qualquer código é especulativo.
   Não é tarefa de engenharia, é decisão de produto/negócio.
2. **Fase 1 — cliente + push (4.1 + 4.2)** para a hipótese escolhida. Entrega valor
   sozinha, sem depender do pull.
3. **Fase 2 — pull por polling (4.3 Caminho A)**, se a hipótese escolhida também
   precisar trazer dado de volta.
4. **Fase 3 — opcional — webhook real (4.3 Caminho B)**, só se a Fase 2 mostrar que
   o atraso de minutos incomoda de verdade, e com orçamento pra mexer no cs-dash.

## 8. Observabilidade e testes

- Reusar o log de uso do cs-dash (tela `Logs` de API Keys) pra auditar o que foi
  enviado — não duplicar esse log aqui.
- Testar `PortalApiClient` com mock de `fetch` (padrão Jest já usado no backend).
- Testar `PortalSyncWorker` cobrindo: sucesso, erro retryable (requeue com backoff),
  erro definitivo (para a fila), `MAX_TENTATIVAS` esgotado — mesmo roteiro de
  `agenda-google.worker.spec.ts`.
- Comando de verificação: `npm.cmd test -- --runInBand` e `npm.cmd run build` em
  `backend/`, como o resto do projeto.

## 9. Riscos e limitações conhecidas

- Sem a Fase 0, este documento é infraestrutura sem consumidor — não implementar
  Fase 1 antes de fechar o dado.
- Caminho B (webhook real) depende de trabalho em outro repositório fora do
  controle direto desta tarefa; não prometer prazo pra ele aqui.
- `apiKeyAuthMiddleware` cacheia a chave por 30s — revogar uma chave comprometida
  não corta acesso instantaneamente do lado do cs-dash.
- Rodando em uma instância só (mesmo aviso que já existe em
  `AgendaGoogleWorker`): múltiplas réplicas do backend exigiriam lock por lote,
  não implementado.

## 10. Próximos passos imediatos

1. Decidir a hipótese da seção 3 (ou trazer uma quarta não listada aqui).
2. Gerar a API Key no cs-dash com o escopo mínimo da hipótese escolhida.
3. Abrir a Fase 1 como tarefa em `AI/TASKS.md`, com o dado e o gatilho já
   definidos.
