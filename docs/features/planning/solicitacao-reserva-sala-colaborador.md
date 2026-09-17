# Plano: solicitação de reserva de sala pelo colaborador

Status: **implementado no código em 17/09/2026**. A migration foi gerada com
`--create-only` e ainda precisa ser aplicada nos ambientes de destino. Consulte
a seção 14 de `AI/TASKS.md` e a sessão de 17/09/2026 antes de continuar.

## 1. Objetivo

Permitir que um administrador habilite ou desabilite globalmente a criação de
solicitações de reserva de sala por colaboradores. Quando habilitado, quem tem a
rotina `agendamentos` pode pedir uma sala para si; o pedido nasce sempre em
`SOLICITADA` e aguarda um administrador confirmar ou cancelar, no mesmo princípio
do fluxo pessoal de Solicitações.

Com a configuração desabilitada, o comportamento atual permanece: colaboradores
consultam a agenda, mas apenas administradores registram reservas.

## 2. Regras de negócio

- A configuração é global para o módulo, não por sala nem por departamento.
- O padrão é `false`, preservando o comportamento dos ambientes existentes.
- Apenas `ADMIN` altera a configuração em **Configurações > Salas**.
- Qualquer usuário autenticado com a rotina `agendamentos` pode consultar o
  valor, pois a tela precisa decidir se mostra a ação de solicitar.
- A rota pessoal não aceita `solicitanteId`, `responsavelId`,
  `destinatariosNotificacao` nem `status` enviados pelo cliente.
- O backend define `solicitanteId` e `registradoPorId` como o usuário
  autenticado, sem confiar no frontend.
- A reserva criada pelo colaborador nasce obrigatoriamente em `SOLICITADA`, sem
  responsável e com avisos destinados ao próprio solicitante.
- `SOLICITADA` ocupa o horário, como já ocorre hoje, evitando duas aprovações
  concorrentes para a mesma sala.
- O pedido só entra na Agenda Google depois de confirmado. Cancelar um pedido
  pendente continua enfileirando a limpeza de forma idempotente.
- O colaborador pode cancelar somente uma solicitação própria ainda em
  `SOLICITADA`; não pode editar, confirmar, excluir nem cancelar reservas de
  terceiros ou já decididas.
- Desabilitar novas solicitações não impede o cancelamento dos pedidos pendentes
  já criados.
- O administrador preserva o fluxo atual: escolhe solicitante, responsável e
  status e pode confirmar, editar, cancelar ou excluir.

## 3. Modelagem e migration

Adicionar um singleton ao Prisma:

```prisma
model AgendamentoConfig {
  id                           String   @id @default("global")
  permiteSolicitacaoColaborador Boolean @default(false)
  criadoEm                     DateTime @default(now())
  atualizadoEm                 DateTime @updatedAt
}
```

O service usa `upsert({ where: { id: 'global' } })`; a ausência da linha é lida
como `false`. A migration deve ser gerada pelo Prisma e nunca por alteração
manual do banco.

## 4. Contrato HTTP

### Configuração

```http
GET /v1/agendamento/config
```

Exige JWT + rotina `agendamentos` e retorna:

```json
{ "permiteSolicitacaoColaborador": false }
```

```http
PUT /v1/agendamento/config
```

Exige `ADMIN` + rotina `agendamentos`:

```json
{ "permiteSolicitacaoColaborador": true }
```

### Solicitação pessoal

```http
POST /v1/agendamento/reservas/minhas
```

Exige JWT + rotina `agendamentos`. Corpo permitido:

```json
{
  "salaId": "uuid",
  "data": "2026-09-18",
  "horaInicio": "10:00",
  "horaFim": "11:00",
  "titulo": "Reunião",
  "observacoes": "Opcional",
  "notificarTelegram": true
}
```

A API responde `403` quando a configuração estiver desligada.

```http
POST /v1/agendamento/reservas/:id/cancelar-minha
```

Cancela somente um pedido próprio ainda pendente. Não depende de a configuração
continuar ligada.

As rotas administrativas existentes permanecem com `RolesGuard` e
`@Roles('ADMIN')`.

## 5. Backend

- Criar `AgendamentoConfigService`, controller e DTO dentro de
  `backend/src/agendamento/`.
- Registrar controller/provider em `AgendamentoModule`.
- Criar DTO específico para a solicitação pessoal, sem campos administrativos.
- Acrescentar a criação pessoal e o cancelamento pessoal em
  `ReservasController`/`ReservasService`.
- Reaproveitar as validações atuais de data futura, sala ativa,
  disponibilidade, sobreposição e solicitante ativo.
- Na criação pendente, avisar o colaborador e os administradores. Não criar
  evento na Agenda Google antes da confirmação.
- Preservar a barreira real na API; a ocultação do botão no frontend é apenas
  UX.

## 6. Frontend

- Adicionar tipos, chamadas e hooks de configuração, solicitação pessoal e
  cancelamento pessoal no módulo `agendamento`.
- Em `SalasAdminPage`, exibir uma chave global com texto claro sobre o efeito da
  configuração.
- Em `AgendamentosPage`, mostrar **Solicitar sala** somente para `USER` quando a
  flag estiver ligada e houver sala ativa.
- Criar `SolicitarReservaDialog.tsx`, enxuto e horizontal, reutilizando
  `GradeHorarios` e as validações visuais atuais; não reutilizar o formulário
  administrativo com campos escondidos, pois ele consulta usuários e permite
  escolhas que um colaborador não deve fazer.
- Exibir o pedido criado na lista com o badge **Solicitada**.
- Mostrar **Cancelar solicitação** somente na própria reserva pendente.

## 7. Testes e validação

### Backend

- configuração ausente retorna `false`;
- `upsert` persiste a alteração;
- flag desligada bloqueia criação pessoal;
- flag ligada cria em nome do autenticado e com status `SOLICITADA`;
- pedido pendente ocupa o horário;
- solicitação pessoal não enfileira Agenda antes da confirmação;
- criação notifica solicitante e administradores;
- colaborador cancela somente pedido próprio pendente;
- rotas administrativas continuam protegidas.

### Frontend

- configuração administrativa é exibida e pode ser alternada;
- colaborador não vê a ação com a flag desligada;
- colaborador vê e envia o formulário com a flag ligada;
- payload pessoal não contém solicitante, responsável ou status;
- colaborador pode cancelar apenas pedido próprio pendente;
- fluxo administrativo atual continua coberto.

Ao concluir, executar as suítes e os builds completos de backend e frontend,
além de `prisma migrate status` no ambiente local configurado.

## 8. Critérios de aceite

- administrador liga/desliga a permissão sem editar ambiente ou banco;
- com a flag desligada, frontend não oferece o fluxo e backend rejeita chamada
  direta;
- com a flag ligada, colaborador com a rotina solicita apenas para si;
- novo pedido aparece em `SOLICITADA` e ocupa o horário;
- administrador confirma ou cancela pelo fluxo atual;
- colaborador consegue cancelar apenas seu pedido ainda pendente;
- Agenda Google recebe o evento somente após confirmação;
- testes, builds, migration e documentação de `AI/` ficam atualizados.

## 9. Coordenação com outros agentes

Este checkout está sendo alterado por outros agentes em 17/09/2026. Antes deste
trabalho já havia mudanças locais em `backend/prisma/schema.prisma`,
`frontend/src/modules/agendamento/components/ReservaDialog.tsx`,
`AI/CONTEXT.md`, `AI/TASKS.md`, `AI/SESSIONS/17-09-2026.md` e em arquivos de
plantões/patrimônio. Essas mudanças não pertencem a esta feature e não devem
ser revertidas.

Antes de editar arquivo compartilhado, reler o conteúdo e o `git diff`. Manter
as alterações desta feature limitadas ao módulo de agendamento, ao novo model e
migration e aos acréscimos documentais. Não usar reset/checkout para resolver
conflitos.

## 10. Arquivos previstos

### Backend

- `backend/prisma/schema.prisma` e nova migration;
- `backend/src/agendamento/agendamento-config.controller.ts`;
- `backend/src/agendamento/agendamento-config.service.ts` e spec;
- `backend/src/agendamento/dto/agendamento-config.dto.ts`;
- `backend/src/agendamento/dto/reserva-colaborador.dto.ts`;
- `backend/src/agendamento/agendamento.module.ts`;
- `backend/src/agendamento/reservas.controller.ts`;
- `backend/src/agendamento/reservas.service.ts` e spec;
- `backend/src/agendamento/reservas-agenda.service.ts`;
- `backend/src/agendamento/reserva-telegram.util.ts`;
- `backend/src/telegram/telegram.service.ts` para disponibilizar o novo tipo ao
  grupo quando o administrador optar por ligá-lo.

### Frontend

- `frontend/src/modules/agendamento/types/agendamento.types.ts`;
- `frontend/src/modules/agendamento/api/agendamento.api.ts`;
- `frontend/src/modules/agendamento/hooks/useAgendamento.ts`;
- `frontend/src/modules/agendamento/components/SolicitarReservaDialog.tsx` e
  teste;
- `frontend/src/modules/agendamento/pages/AgendamentosPage.tsx` e teste;
- `frontend/src/modules/agendamento/pages/SalasAdminPage.tsx` e teste.

### Documentação

- este plano;
- `docs/README.md`;
- `AI/CONTEXT.md`;
- `AI/TASKS.md`;
- `AI/SESSIONS/17-09-2026.md`.

## 11. Resultado e ponto de retomada

Todos os itens deste plano foram implementados. Os testes direcionados passaram
no backend (74) e frontend (24), e o build do frontend passou. A suíte completa
do frontend passou inicialmente com 175 testes; após mudanças concorrentes no
módulo `convites-agenda`, a repetição final falhou somente nos 9 testes daquele
módulo. No backend, 33 suítes/395 testes passaram e a validação do Prisma passou;
a suíte completa e o build encontram somente erros de compilação no teste de
`convites-agenda`, módulo alterado por outro agente no mesmo checkout e não
tocado por esta tarefa.

Para retomar: primeiro releia `AI/SESSIONS/17-09-2026.md` e confira o estado do
módulo concorrente; depois aplique a migration pendente no ambiente adequado e
repita `npm.cmd test`/`npm.cmd run build` no backend quando o contrato de
`convites-agenda` estiver estabilizado. Não reverta arquivos compartilhados para
isolar esta feature.
