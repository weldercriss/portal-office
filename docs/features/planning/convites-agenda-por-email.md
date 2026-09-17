# Plano: convites de Agenda Google por e-mail

Status: **Fases 1–3 (banco, backend, frontend) implementadas em 17/09/2026**,
desligadas por `GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED=false`. A Fase 0 (prova
manual numa conta real do Google Workspace) e a Fase 4 (ativação controlada em
homologação) continuam pendentes — são trabalho operacional, não de código.
Detalhe da implementação em
[AI/SESSIONS/17-09-2026.md](../../../AI/SESSIONS/17-09-2026.md#convites-de-agenda-por-e-mail-implementação)
e o contrato vigente em
[AI/CONTEXT.md](../../../AI/CONTEXT.md#convites-de-agenda-em-massa). O restante
deste documento é o levantamento original, preservado como referência de design;
onde ele divergir do código, o código manda.

## 1. Objetivo

Alterar o módulo `/convites-agenda` para que o RH crie **um único evento** na
agenda do administrador solicitante e envie convites oficiais do Google para uma
lista de e-mails.

Somente quem envia o convite precisa conectar a Agenda Google ao portal. Os
destinatários:

- não precisam conectar suas agendas;
- não precisam ter cadastro ou acesso ao portal;
- recebem o convite por e-mail;
- podem responder **Sim**, **Não** ou **Talvez** pelo Google Agenda ou pelo
  e-mail;
- recebem atualizações e cancelamentos enviados pelo organizador.

O módulo permanece exclusivo de `ADMIN`, pois é uma ferramenta interna do RH com
capacidade de enviar mensagens e compromissos em massa.

## 2. Resultado esperado

Fluxo proposto:

```text
Administrador do RH conectado à Agenda Google
                     │
                     │ cria um único evento
                     ▼
        Agenda principal do administrador
                     │
                     │ attendees + sendUpdates=all
                     ▼
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  pessoa A      pessoa B      e-mail sem
  cadastrada    sem conexão    conta no portal
```

O organizador é a conta Google do administrador autenticado que executou o
envio. Não é possível informar qualquer endereço no campo “De”: a Calendar API
define o organizador a partir da agenda e da credencial OAuth usadas para criar o
evento.

## 3. Escopo da primeira versão

### Incluído

- organizador igual ao `ADMIN` autenticado que envia o convite;
- conexão OAuth exigida apenas do organizador;
- seleção de colaboradores ativos do portal independentemente de conexão com a
  Agenda;
- inclusão manual de e-mails que não possuem cadastro no portal;
- restrição opcional aos domínios corporativos configurados;
- deduplicação e normalização de e-mails;
- limite de até 200 destinatários individuais por evento;
- evento único com `attendees` e envio de notificações via `sendUpdates=all`;
- atualização e cancelamento do evento único;
- retry idempotente quando a chamada ao Google falhar;
- disponibilidade por Free/Busy, quando o organizador tiver acesso;
- sincronização manual dos estados de resposta dos convidados;
- convivência com convites antigos, criados como cópias individuais;
- auditoria do criador, organizador, destinatários, falhas e IDs remotos.

### Fora do escopo inicial

- service account com delegação em todo o domínio;
- conta organizadora central configurável, como `rh@empresa.com`;
- forçar o evento diretamente na agenda do convidado sem que suas configurações
  de convite permitam isso;
- editar a lista de convidados depois do primeiro envio;
- recorrência de eventos;
- Google Meet automático;
- anexos do Google Drive;
- webhook do Google para atualizar RSVP em tempo real;
- envio para mais de 200 e-mails individuais.

Uma conta central do RH pode ser adicionada depois sem mudar o conceito do evento
único. Nessa evolução, `criadoPor` continua sendo a auditoria de quem operou o
portal, enquanto outro usuário passa a ser o organizador Google.

## 4. Estado atual do projeto

Hoje `ConvitesAgendaService`:

1. recebe `destinatarioIds` de usuários do portal;
2. consulta quais destinatários possuem `AgendaGoogleConexao` utilizável;
3. bloqueia na interface quem não conectou a agenda;
4. lê os eventos de cada destinatário para verificar conflitos;
5. cria uma cópia independente na agenda de cada pessoa;
6. guarda `calendarId`, `eventId` e `googleSub` em cada
   `ConviteAgendaDestinatario`;
7. atualiza ou remove cada cópia individualmente.

Consequências do modelo atual:

- todos precisam autorizar o portal;
- um convite para 100 pessoas produz até 100 eventos independentes;
- não existe um organizador com lista central de convidados;
- não há RSVP compartilhado;
- uma falha individual produz `INDISPONIVEL` ou `FALHA` para aquela cópia.

O escopo OAuth existente é
`https://www.googleapis.com/auth/calendar.events`, suficiente para criar e
editar eventos na agenda autorizada. A checagem Free/Busy exigirá acrescentar o
escopo mínimo `https://www.googleapis.com/auth/calendar.events.freebusy`, o que
obriga o organizador a passar novamente pelo consentimento depois da mudança.

## 5. Comportamento-alvo

### 5.1 Organizador

Na primeira versão, o organizador será sempre o `ADMIN` autenticado:

- o backend usa `req.user.id` para obter sua `AgendaGoogleConexao`;
- a conexão deve estar em estado `CONECTADA` e conter refresh token utilizável;
- o e-mail Google autorizado já é validado pelo fluxo OAuth contra o e-mail do
  usuário do portal;
- `User.agendaGoogleAtiva` não deve bloquear este envio manual. Esse campo é uma
  preferência para sincronizações pessoais automáticas; ao clicar em “Enviar
  convites”, o administrador expressou a intenção de usar a conexão;
- se a autorização foi perdida, a API responde com erro de negócio e a tela
  oferece **Reconectar Agenda Google**.

O evento é criado em `GOOGLE_CALENDAR_ID`, hoje `primary` por padrão. O banco
salva snapshots de `organizadorEmail` e `organizadorGoogleSub`; uma conexão
posterior com outra identidade não pode alterar ou excluir o evento antigo.

### 5.2 Destinatários

A fonte final do convite é uma lista de e-mails normalizados:

- colaboradores selecionados fornecem seu `User.email`;
- e-mails digitados manualmente entram na mesma lista;
- normalização: `trim()` e lowercase;
- duplicados são eliminados antes da validação de limite;
- e-mail igual ao do organizador é rejeitado ou removido com aviso;
- quando o e-mail corresponder a um usuário ativo, guardar também `userId` para
  navegação e auditoria; o vínculo não é obrigatório;
- a API revalida tudo, sem confiar na deduplicação ou nos domínios feita pelo
  frontend.

Como a plataforma é interna do RH, criar a variável
`GOOGLE_CALENDAR_INVITE_ALLOWED_DOMAINS`. Em produção, quando preenchida, somente
e-mails desses domínios podem ser convidados. Não reutilizar silenciosamente
`GOOGLE_ALLOWED_DOMAINS`, pois ela controla login/provisionamento e tem uma
responsabilidade diferente.

### 5.3 Privacidade dos convidados

Criar o evento com:

- `guestsCanInviteOthers: false`;
- `guestsCanModify: false`;
- `guestsCanSeeOtherGuests: false` por padrão.

Isso evita que uma lista interna de colaboradores seja exposta a todos os
convidados e impede encaminhamento pelo próprio evento. Se o RH precisar que os
participantes vejam a lista, essa opção pode virar um campo explícito no futuro.

### 5.4 Entrega e presença na agenda

Usar `sendUpdates=all` no `events.insert`, `events.patch` e `events.delete`.
Assim, o Google envia convite, atualização ou cancelamento aos convidados.

O portal não pode garantir que o evento apareça imediatamente na agenda do
destinatário. Isso depende da configuração pessoal:

- “De todos”: tende a adicionar automaticamente;
- “Somente se o remetente for conhecido”: adiciona quando o organizador é do
  mesmo domínio, já interagiu ou está nos contatos;
- “Quando eu responder”: só adiciona após o RSVP no e-mail.

O produto deve dizer “convite enviado”, nunca “evento inserido na agenda de
todos”. Não preencher `attendees[].responseStatus` artificialmente: isso não
substitui a resposta da pessoa nem força a inclusão.

Referências oficiais:
[convidar participantes](https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events),
[criar evento e `sendUpdates`](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert),
[recurso Event](https://developers.google.com/workspace/calendar/api/v3/reference/events)
e [comportamento dos convites para usuários](https://support.google.com/calendar/answer/37161).

## 6. Disponibilidade sem conexão individual

O endpoint atual lê títulos e horários usando o token de cada destinatário. Isso
deixa de ser possível quando eles não conectam suas agendas.

Substituir por `POST /calendar/v3/freeBusy` usando o token do organizador:

- enviar os e-mails/calendários em lotes de no máximo 50, limite da API;
- pedir apenas intervalos ocupados, sem título ou descrição;
- classificar cada destinatário como `LIVRE`, `OCUPADO` ou `DESCONHECIDO`;
- `DESCONHECIDO` cobre calendário inexistente, externo, não compartilhado,
  política do domínio ou erro parcial;
- a indisponibilidade de Free/Busy não impede o envio; o admin confirma sabendo
  que a agenda não pôde ser consultada;
- mostrar apenas os intervalos ocupados retornados, nunca inventar o nome do
  compromisso;
- descartar a verificação quando horário ou destinatários mudarem.

O endpoint Free/Busy aceita os escopos `calendar.events.freebusy` ou
`calendar.freebusy` e retorna no máximo 50 calendários expandidos por chamada.
[Documentação oficial do Free/Busy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)
e [escopos da Calendar API](https://developers.google.com/workspace/calendar/api/auth).

Para usuários do mesmo Google Workspace, a conta do RH normalmente consegue ao
menos livre/ocupado conforme as políticas do domínio. Isso precisa ser confirmado
em homologação; não deve ser assumido pelo código.

## 7. Modelagem de dados

### 7.1 Novos enums

```prisma
enum ConviteAgendaModo {
  COPIAS_INDIVIDUAIS
  EVENTO_COM_CONVIDADOS
}

enum ConviteAgendaEventoStatus {
  PENDENTE
  ENVIADO
  FALHA
  CANCELADO
}

enum ConviteAgendaResposta {
  PENDENTE
  ACEITO
  RECUSADO
  TALVEZ
  DESCONHECIDO
}
```

Mapeamento Google → banco:

| Google `responseStatus` | Portal |
| --- | --- |
| `needsAction` | `PENDENTE` |
| `accepted` | `ACEITO` |
| `declined` | `RECUSADO` |
| `tentative` | `TALVEZ` |
| ausente ou não reconhecido | `DESCONHECIDO` |

### 7.2 `ConviteAgendaEvento`

Adicionar:

```prisma
modo                     ConviteAgendaModo         @default(COPIAS_INDIVIDUAIS)
statusEvento             ConviteAgendaEventoStatus?
organizadorEmail         String?
organizadorGoogleSub     String?
calendarId               String?
eventId                  String?
ultimoErro               String?
enviadoEm                DateTime?
canceladoEm              DateTime?
respostasSincronizadasEm DateTime?
```

`criadoPorId` continua identificando o administrador que operou o portal. Na
primeira versão, ele também é usado para recuperar a credencial do organizador.
Os snapshots impedem que uma troca de conta Google redirecione alterações para a
agenda errada.

### 7.3 `ConviteAgendaDestinatario`

Adaptar para destinatários sem cadastro:

```prisma
userId      String?
user        User?                  @relation(...)
email       String
nome        String?
resposta    ConviteAgendaResposta  @default(PENDENTE)
respondidoEm DateTime?

@@unique([conviteId, email])
@@index([userId])
```

Os campos atuais `calendarId`, `eventId`, `googleSub`, `usuarioEmail`, `status` e
`erro` permanecem temporariamente para os registros legados. Eventos novos não
gravam um evento remoto por destinatário; o vínculo remoto fica em
`ConviteAgendaEvento`.

O serviço sempre grava `email` em lowercase. A constraint composta é uma segunda
barreira contra duplicidade, não o mecanismo de normalização.

### 7.4 Migration e backfill

Criar migration Prisma, sem editar o banco diretamente:

1. adicionar enums, colunas novas e tornar `userId` opcional;
2. adicionar `email` inicialmente opcional;
3. fazer backfill de `email` usando `usuarioEmail` e, quando vazio, `User.email`;
4. preencher `nome` usando `User.nome` quando houver vínculo;
5. marcar todos os eventos existentes como `COPIAS_INDIVIDUAIS`;
6. criar a unicidade `(conviteId, email)` depois de validar duplicidades;
7. tornar `email` obrigatório numa migration seguinte, se o PostgreSQL não
   permitir realizar o backfill e a restrição com segurança na mesma migration.

Antes do índice, gerar relatório de duplicidades case-insensitive. Se existirem,
manter uma linha canônica por e-mail e preservar a de melhor estado, sem apagar
eventos remotos automaticamente.

## 8. Contrato da API

### 8.1 Status do organizador

```http
GET /convites-agenda/organizador/status
```

Resposta:

```json
{
  "conectado": true,
  "email": "rh@empresa.com",
  "precisaReconectar": false,
  "podeConsultarDisponibilidade": true
}
```

O endpoint usa o usuário autenticado; não aceita `userId` arbitrário.

### 8.2 Destinatários cadastrados

Manter:

```http
GET /convites-agenda/colaboradores
```

Retornar todos os colaboradores ativos com `id`, `nome` e `email`. Remover
`disponivel`, pois conexão individual deixa de ser requisito.

### 8.3 Verificar disponibilidade

```http
POST /convites-agenda/verificar
```

```json
{
  "inicio": "2026-10-01T13:00:00.000Z",
  "fim": "2026-10-01T14:00:00.000Z",
  "destinatarioEmails": ["ana@empresa.com", "bia@empresa.com"]
}
```

Resposta:

```json
[
  { "email": "ana@empresa.com", "status": "LIVRE", "ocupado": [] },
  {
    "email": "bia@empresa.com",
    "status": "OCUPADO",
    "ocupado": [{ "inicio": "...", "fim": "..." }]
  }
]
```

Quando não houver acesso, responder por item com `DESCONHECIDO`; só uma falha da
requisição como um todo deve produzir erro HTTP.

### 8.4 Criar convite

```http
POST /convites-agenda
```

```json
{
  "titulo": "Treinamento interno",
  "descricao": "...",
  "local": "Sala 1",
  "inicio": "2026-10-01T13:00:00.000Z",
  "fim": "2026-10-01T14:00:00.000Z",
  "destinatarioEmails": ["ana@empresa.com", "bia@empresa.com"]
}
```

Validações:

- título e intervalo válidos;
- de 1 a 200 e-mails únicos;
- todos os e-mails válidos e, quando configurado, pertencentes ao allowlist;
- organizador não incluído;
- organizador conectado e com identidade compatível;
- tamanho máximo do payload;
- criação restrita a `ADMIN`.

### 8.5 Editar, cancelar, tentar novamente e sincronizar respostas

```http
PATCH /convites-agenda/:id
POST  /convites-agenda/:id/cancelar
POST  /convites-agenda/:id/reenviar
POST  /convites-agenda/:id/sincronizar-respostas
```

- `PATCH` altera título, descrição, local e horário; não altera convidados na
  primeira versão;
- `cancelar` exclui/cancela o evento do organizador com `sendUpdates=all`;
- `reenviar` só aparece para `FALHA` e repete a tentativa idempotente de criar o
  mesmo evento; não é um botão genérico para bombardear convidados com e-mails;
- `sincronizar-respostas` consulta o evento no Google e atualiza os RSVPs locais;
- registros `COPIAS_INDIVIDUAIS` continuam usando o comportamento legado.

## 9. Cliente Google Calendar

Ampliar `EventoAgenda` com:

```ts
attendees?: { email: string }[];
guestsCanInviteOthers?: boolean;
guestsCanModify?: boolean;
guestsCanSeeOtherGuests?: boolean;
```

Adicionar métodos explícitos ao `GoogleCalendarClient`:

- `criarComConvidados(organizadorId, calendarId, eventId, evento)`;
- `atualizarComConvidados(organizadorId, calendarId, eventId, evento)`;
- `cancelarComConvidados(organizadorId, calendarId, eventId)`;
- `obterComConvidados(organizadorId, calendarId, eventId)`;
- `consultarLivreOcupado(organizadorId, emails, inicio, fim)`.

Não alterar silenciosamente o comportamento dos métodos usados por plantões e
reservas. Esses fluxos continuam criando eventos pessoais sem convidados. Os
novos métodos deixam explícito quando `sendUpdates=all` será usado.

### 9.1 ID e idempotência

Gerar um ID determinístico central, por exemplo:

```ts
eventIdDeterministico(`convite-central:${convite.id}`, criadoPorId)
```

Fluxo de criação:

1. transação cria evento e destinatários locais com `PENDENTE`;
2. chamada ao Google cria o evento com o ID determinístico;
3. sucesso grava `ENVIADO`, `calendarId`, `eventId` e `enviadoEm`;
4. falha grava `FALHA` e erro sanitizado;
5. em retry, um `409` leva a `events.get`;
6. se o evento existente possui
   `extendedProperties.private.conviteAgendaId` esperado, considerar sucesso sem
   reenviar atualização;
7. se o ID existe mas não pertence ao convite, tratar como conflito grave e não
   sobrescrever.

Esse tratamento evita evento duplicado e reduz e-mails repetidos quando o Google
teve sucesso, mas a atualização do banco falhou.

### 9.2 Atualização

O `PATCH` deve sempre reconstruir o corpo completo relevante a partir do banco,
incluindo todos os `attendees`, porque listas em patches de APIs podem substituir
o valor inteiro. Usar `sendUpdates=all` para que os participantes recebam a
alteração.

### 9.3 Cancelamento

Enviar `DELETE` com `sendUpdates=all`. Tratar `404` e `410` como cancelamento já
concluído e atualizar o banco para `CANCELADO`. Nunca apagar o histórico local.

## 10. Serviço de domínio

Refatorar `ConvitesAgendaService` em métodos privados distintos por modo:

```text
criarEventoComConvidados
atualizarEventoComConvidados
cancelarEventoComConvidados
sincronizarRespostas

atualizarCopiasLegadas
cancelarCopiasLegadas
```

Evitar criar outro módulo ou uma camada Repository. O service continua injetando
`PrismaService`, `GoogleCalendarClient` e `AgendaGoogleService` diretamente.

Regras principais:

- nova criação sempre usa `EVENTO_COM_CONVIDADOS`;
- ações em registros antigos são roteadas pelo campo `modo`;
- `organizadorGoogleSub` precisa coincidir antes de qualquer alteração remota;
- falha do Google não desfaz o registro local, permitindo retry e auditoria;
- erros persistidos são sanitizados e limitados; tokens e respostas brutas não
  são armazenados;
- nenhuma chamada externa ocorre dentro de transação Prisma.

## 11. Sincronização de RSVP

Na primeira versão, a sincronização é solicitada pelo administrador na tela de
detalhes:

1. buscar o evento central com `events.get` usando a conexão do organizador;
2. percorrer `attendees` retornados;
3. normalizar o e-mail e localizar `ConviteAgendaDestinatario`;
4. mapear `responseStatus` para o enum local;
5. gravar `respondidoEm` quando o estado mudar;
6. atualizar `respostasSincronizadasEm` no evento;
7. preservar como `DESCONHECIDO` destinatários ausentes da resposta sem removê-los.

Mostrar na interface quando os dados foram atualizados. Não consultar o Google
para cada linha da listagem geral; isso aumenta latência e consumo de quota.

Evolução possível: worker periódico ou push notifications da Calendar API. Só
implementar depois de validar que atualização manual não atende o RH.

## 12. Frontend

### 12.1 Estado do organizador

No topo de `ConvitesAgendaPage`:

- conectado: mostrar “Os convites sairão de `email@empresa.com`”;
- desconectado: mostrar orientação e botão **Conectar Agenda Google**;
- reconexão necessária: bloquear criação e mostrar **Reconectar**;
- o botão pode reutilizar a API/fluxo já existente no card de Meu perfil.

Não abrir o diálogo de criação quando o organizador não estiver apto.

### 12.2 Seleção de destinatários

Substituir a lista que desabilita pessoas sem conexão por:

- busca por nome ou e-mail entre colaboradores ativos;
- checkbox habilitado para todos;
- campo “Adicionar e-mail” com Enter/botão para criar chips;
- chips removíveis para e-mails selecionados;
- contador `N/200`;
- aviso para duplicado, domínio não permitido ou e-mail do organizador;
- indicação “Sem cadastro no portal” nos e-mails manuais;
- nenhuma indicação de “Agenda não conectada”.

O estado dos inputs permanece local no diálogo. Colaboradores e status do
organizador continuam em TanStack Query.

### 12.3 Disponibilidade

Manter o botão **Verificar disponibilidade**, alterando os resultados:

- `LIVRE`: badge verde;
- `OCUPADO`: badge amarelo com intervalos;
- `DESCONHECIDO`: badge neutro com “Agenda não consultável”;
- resultado desconhecido não desabilita **Enviar convites**;
- qualquer mudança de horário ou destinatário invalida a verificação;
- a verificação continua obrigatória antes de enviar, mas o admin pode prosseguir
  com itens desconhecidos após visualizar o aviso.

### 12.4 Listagem e detalhes

Na lista:

- mostrar badge do evento: Pendente, Enviado, Falha ou Cancelado;
- mostrar total e resumo de RSVP;
- mostrar o e-mail organizador;
- mostrar badge “Legado” para `COPIAS_INDIVIDUAIS`;
- substituir “Reenviar pendentes” por “Tentar envio novamente” apenas em falha.

Nos detalhes:

- listar nome quando houver usuário e sempre exibir o e-mail;
- mostrar Pendente/Aceito/Recusado/Talvez/Desconhecido;
- oferecer **Atualizar respostas** e exibir horário da última sincronização;
- preservar visualização e ações antigas para registros legados;
- usar `Dialog` do portal para confirmação de cancelamento.

### 12.5 Tipos, API e hooks

Atualizar:

- `types/convite-agenda.types.ts` com modo, status do evento, resposta, e-mail do
  organizador e disponibilidade por e-mail;
- `api/convites-agenda.api.ts` usando exclusivamente `httpClient`;
- `hooks/useConvitesAgenda.ts` com query do organizador e mutation de respostas;
- função central de invalidação para lista, detalhe e status afetados.

## 13. Segurança, abuso e privacidade

- manter `JwtAuthGuard`, `RolesGuard` e `@Roles('ADMIN')` em todas as rotas;
- validar allowlist de domínio no backend;
- limitar a 200 destinatários e limitar tamanho total do payload;
- aplicar rate limit específico à criação/retry se a infraestrutura do projeto
  ganhar suporte a rate limiting;
- nunca aceitar `organizadorId` ou `from` fornecido pelo navegador;
- nunca registrar refresh/access token ou corpo bruto de erro do Google;
- ocultar a lista de convidados no evento por padrão;
- preservar auditoria de quem criou, quando enviou, cancelou e tentou novamente;
- revisar na homologação as cotas e políticas antispam da conta Google usada;
- preferir uma conta corporativa do Workspace, não Gmail pessoal.

O Google pode limitar convites em massa conforme tipo e reputação da conta. O
limite funcional de 200 convidados por evento não elimina limites de envio e
abuso. Para públicos maiores, avaliar Google Groups em uma fase própria, com
governança de membros e testes de RSVP.

## 14. Tratamento de falhas

| Situação | Comportamento |
| --- | --- |
| Organizador sem conexão | Bloquear antes de persistir e oferecer conexão. |
| Token revogado/`invalid_grant` | Marcar conexão como `RECONECTAR`, evento como `FALHA` quando aplicável. |
| `401` ou `403` de autorização | Não repetir indefinidamente; exigir reconexão ou correção administrativa. |
| `429`, rede ou `5xx` | Salvar `FALHA` retryable e permitir nova tentativa com o mesmo ID. |
| Google criou, banco falhou | Retry encontra o ID e confirma pelas `extendedProperties`, sem duplicar. |
| Destinatário inválido | Rejeitar o payload antes do Google. |
| Free/Busy parcial | Retornar `DESCONHECIDO` só para os itens afetados. |
| Evento removido manualmente | Em atualização, informar que o evento sumiu e permitir recriação consciente. |
| Conta Google do admin mudou | Não tocar no evento antigo; exigir a identidade original. |
| Cancelamento repetido | `404`/`410` contam como sucesso idempotente. |

## 15. Compatibilidade com registros existentes

Não converter automaticamente cópias antigas em evento central. Isso dispararia
novos convites, criaria duplicidades e poderia apagar compromissos já existentes.

Estratégia:

- migrations marcam registros existentes como `COPIAS_INDIVIDUAIS`;
- listagem identifica esses registros como “Legado”;
- edição, retry e cancelamento continuam usando a lógica atual por destinatário;
- toda criação nova usa `EVENTO_COM_CONVIDADOS`;
- após um período definido e quando não houver mais ações relevantes sobre
  legados, abrir tarefa separada para remover campos e código antigos.

Essa compatibilidade deve ter testes próprios; não manter o caminho antigo sem
cobertura.

## 16. Fases de implementação

### Fase 0 — validação manual da hipótese

Antes de mudar o schema:

1. usar uma conta Google Workspace de teste do RH;
2. criar manualmente, pelo APIs Explorer ou script descartável, um evento com
   dois convidados e `sendUpdates=all`;
3. usar um destinatário do mesmo domínio sem conexão com o portal;
4. usar um endereço sem cadastro no portal;
5. confirmar recebimento, RSVP, atualização e cancelamento;
6. validar Free/Busy e políticas do domínio;
7. registrar se reconexão com o novo escopo foi necessária.

**Saída:** evidência de que as políticas reais do Workspace permitem o fluxo.

### Fase 1 — banco e contratos

- criar migrations e backfill;
- atualizar DTOs e tipos;
- adicionar modo/status/resposta e vínculo central;
- manter compatibilidade legada.

**Saída:** banco preparado sem mudar ainda a experiência em produção.

### Fase 2 — cliente Google e backend

- adicionar métodos com convidados e `sendUpdates`;
- implementar idempotência, criação, atualização, cancelamento e retry;
- implementar status do organizador e Free/Busy em lotes;
- implementar sincronização manual de respostas;
- manter fluxo legado por modo.

**Saída:** APIs testadas com mocks e homologação Google.

### Fase 3 — frontend

- adaptar diálogo para e-mails e todos os colaboradores ativos;
- adicionar status/conexão do organizador;
- adaptar disponibilidade, listagem, detalhes, retry e RSVP;
- atualizar testes de componentes e APIs.

**Saída:** fluxo completo disponível em homologação.

### Fase 4 — ativação controlada

- publicar com integração desligada ou restrita ao ambiente de homologação;
- aplicar migration;
- reconectar a conta de teste/RH com o novo escopo;
- executar roteiro ponta a ponta;
- habilitar para administradores;
- observar erros, cotas e entregas antes de uso amplo.

**Saída:** convites por e-mail como padrão para novos eventos.

## 17. Testes automatizados

### Backend — unitários

Cobrir em `convites-agenda.service.spec.ts`:

- normalização, deduplicação e limite de e-mails;
- domínio permitido e organizador removido da lista;
- destinatário sem usuário do portal;
- organizador sem conexão ou com identidade trocada;
- criação local antes da chamada externa;
- sucesso, falha retryable, autorização perdida e retry por ID determinístico;
- `409` pertencente ao mesmo convite e conflito com outro convite;
- atualização/cancelamento com `sendUpdates=all`;
- `404`/`410` idempotentes;
- mapeamento de RSVP;
- Free/Busy em lotes de 50 e falha parcial;
- roteamento correto entre novo modo e legado;
- nenhum evento Google duplicado em retry.

Cobrir em `google-calendar.client`:

- `attendees` no payload;
- parâmetros `sendUpdates=all` em insert/patch/delete;
- flags de privacidade;
- obtenção do evento e parsing de respostas;
- chamada Free/Busy e classificação de erros.

### Frontend — Vitest/Testing Library

- todos os colaboradores podem ser selecionados sem conectar agenda;
- e-mail manual válido vira chip;
- duplicado, domínio inválido e limite exibem erro;
- criação bloqueada quando organizador não está conectado;
- verificação é invalidada ao mudar horário/lista;
- `DESCONHECIDO` avisa, mas permite envio após verificação;
- payload envia `destinatarioEmails`, nunca IDs como requisito;
- detalhes mostram RSVP e última sincronização;
- retry só aparece para falha;
- cancelamento usa `Dialog`;
- registros legados continuam renderizando e acionando as rotas corretas.

### Integração manual com Google

Testar em homologação:

1. convidado do mesmo domínio, sem conexão com o portal;
2. convidado sem cadastro no portal;
3. configurações de convite “De todos”, “Somente conhecidos” e “Ao responder”;
4. aceite, recusa e talvez refletidos após sincronização;
5. alteração de título e horário;
6. cancelamento recebido por todos;
7. revogação do token do organizador;
8. retry após falha simulada do banco;
9. 51 destinatários para provar o particionamento Free/Busy;
10. privacidade: um convidado não vê a lista dos demais.

## 18. Critérios de aceite

- somente o administrador organizador precisa conectar a Agenda Google;
- colaborador sem conexão aparece selecionável;
- endereço sem cadastro no portal pode receber convite, respeitando o domínio;
- um envio cria exatamente um evento na agenda do organizador;
- todos os e-mails válidos aparecem como `attendees` desse evento;
- destinatários recebem o e-mail oficial do Google;
- tela não afirma que o evento entrou automaticamente na agenda de todos;
- alteração e cancelamento notificam os convidados;
- retry não cria outro evento;
- respostas podem ser sincronizadas e exibidas;
- Free/Busy indisponível não bloqueia o envio;
- convidados não veem os demais por padrão;
- convites antigos continuam consultáveis e canceláveis;
- testes backend/frontend e builds passam;
- `AI/CONTEXT.md`, `AI/TASKS.md`, documentação da Agenda e sessão são atualizados
  ao concluir a implementação.

## 19. Rollback

O deploy deve preservar o caminho legado. Se o novo fluxo apresentar problema:

1. desabilitar novas criações `EVENTO_COM_CONVIDADOS` por feature flag;
2. manter consulta, atualização e cancelamento dos eventos já enviados;
3. não apagar migrations nem os novos campos;
4. voltar temporariamente à criação por cópias individuais apenas se o produto
   aceitar novamente exigir conexão de todos;
5. corrigir e reativar sem reenviar automaticamente convites já marcados como
   `ENVIADO`.

Adicionar `GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED=false` por padrão no primeiro
deploy. A flag controla novas criações, não leitura nem cancelamento de eventos já
existentes.

## 20. Arquivos previstos

### Backend

- `backend/prisma/schema.prisma` e nova(s) migration(s);
- `backend/src/agenda-google/agenda-google-oauth.service.ts` — novo escopo;
- `backend/src/agenda-google/google-calendar.client.ts` — convidados,
  `sendUpdates`, Free/Busy e leitura de RSVP;
- `backend/src/convites-agenda/dto/convite-agenda.dto.ts`;
- `backend/src/convites-agenda/convites-agenda.service.ts`;
- `backend/src/convites-agenda/convites-agenda.controller.ts`;
- specs dos dois módulos;
- `backend/.env.example` e Compose/deploy para as novas variáveis.

### Frontend

- `frontend/src/modules/convites-agenda/types/convite-agenda.types.ts`;
- `frontend/src/modules/convites-agenda/api/convites-agenda.api.ts`;
- `frontend/src/modules/convites-agenda/hooks/useConvitesAgenda.ts`;
- `frontend/src/modules/convites-agenda/components/ConviteAgendaDialog.tsx`;
- `frontend/src/modules/convites-agenda/pages/ConvitesAgendaPage.tsx`;
- testes do diálogo, página e API;
- possível extração/reuso do botão de conexão da Agenda Google já existente em
  Meu perfil.

### Documentação

- `AI/CONTEXT.md`;
- `AI/TASKS.md`;
- `AI/SKILLS/DATABASE/` se a migration consolidar um padrão novo;
- `docs/reference/agenda-google.md` e/ou
  `docs/reference/agenda-google-oauth-individual.md`;
- `docs/README.md`.

## 21. Próximo passo recomendado

Executar primeiro a **Fase 0** com uma conta e dois destinatários de teste. Ela
valida os pontos que o código não consegue decidir sozinho: política real do
Google Workspace, entrega dos e-mails, comportamento de RSVP e acesso Free/Busy.
Com essa evidência, implementar as fases 1 a 3 sem depender de hipóteses sobre a
configuração do domínio.
