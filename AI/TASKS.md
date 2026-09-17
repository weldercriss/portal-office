# Tarefas pendentes do Portal BackOffice

Atualizado em **17/09/2026**. Pendências consolidadas dos planos anteriores, cuja pasta foi removida após esta transferência. O estado implementado está descrito em [CONTEXT.md](CONTEXT.md).

O agendamento de salas e os seis itens transversais (tempo real, Telegram, aprovação direta, substituição de alertas nativos, dashboard e anexo no cadastro) já têm implementação no código. O frontend de **patrimônio e equipamentos** (seções 1–3) foi implementado em 17/09/2026 — ver detalhe em [SESSIONS/17-09-2026.md](SESSIONS/17-09-2026.md#frontend-de-patrimônio-e-equipamentos). Restam a seção 4 (ficha do colaborador) e partes da seção 5 (validação em ambiente real). A situação das migrations e da publicação precisa ser verificada no ambiente de destino; os relatos antigos não confirmam o estado atual.

## 1. Integrar o frontend à API de patrimônio — concluído em 17/09/2026

- [x] Criar `frontend/src/modules/patrimonio/` com `types/patrimonio.types.ts`, `api/patrimonio.api.ts` e `hooks/usePatrimonio.ts`.
- [x] Implementar consultas e mutações para tipos, equipamentos, resumo de estoque, alocações, devolução, cancelamento e termos usando as APIs existentes.
- [x] Usar `FormData` para upload do termo e `httpClientBlob` para download/visualização. Atualizar as consultas afetadas após cada mutação.

Referências: [módulo de agendamento](../../frontend/src/modules/agendamento), [cliente HTTP](../../frontend/src/api/httpClient.ts), [visualização de documentos](../../frontend/src/modules/colaboradores-rh/utils/documento.ts) e [controllers de patrimônio](../../backend/src/patrimonio/patrimonio.controller.ts).

## 2. Construir a tela de inventário e movimentações — concluído em 17/09/2026, com uma pendência

- [x] Criar `pages/PatrimonioPage.tsx` com resumo por situação, listagem e filtros por tipo, situação, conservação, busca e disponibilidade. (Filtro por colaborador não ficou exposto na UI, embora a API aceite `colaboradorId`.)
- [x] Criar cadastro/edição do equipamento: tipo, número de patrimônio, número de série, marca, modelo, conservação, situação, aquisição e observações conforme os DTOs existentes.
- [x] Expor desativação e exclusão definitiva respeitando as restrições de histórico e de equipamento em uso retornadas pela API.
- [x] Criar os diálogos de entrega/alocação, devolução e cancelamento, com colaborador, data de início, estado na entrega/devolução e demais campos suportados pela API.
- [ ] Exibir vínculo atual e **histórico** de entregas — só o vínculo ativo foi implementado (`VinculoDialog.tsx`); a API só inclui a alocação ativa por padrão (`EQUIPAMENTO_INCLUDE`, `take: 1`), então o histórico de alocações encerradas (`DEVOLVIDO`/`CANCELADA`) de um equipamento ainda não tem tela, mesmo já existindo via `GET /patrimonio/alocacoes?equipamentoId=`.
- [x] Permitir anexar, visualizar/baixar e remover termo assinado da alocação, em PDF/DOC/DOCX de até 10 MB. Refletir o status retornado após essas operações.
- [x] Tratar carregamento, lista vazia e falhas com os componentes do portal; usar `Dialog` nas confirmações, sem `alert()` ou `confirm()` nativos.
- [x] Corrigido em 17/09/2026: qualquer colaborador com a rotina via o nome de quem estava com o equipamento de outra pessoa na coluna "Colaborador" do inventário. `redigirColaborador` (`backend/src/patrimonio/equipamentos.service.ts`, reaproveitada em `alocacoes.service.ts`) some essa identidade em `GET /patrimonio/equipamentos`, `/equipamentos/:id`, `/alocacoes` e `/alocacoes/:id` quando quem consulta não é `ADMIN` nem o dono da alocação.
- [x] Vincular vários equipamentos ao mesmo colaborador numa única entrega, com um só termo assinado cobrindo o lote — `VinculoLoteDialog.tsx` (checkbox por linha disponível + "Vincular selecionados" em `PatrimonioPage.tsx`) cria uma alocação por item e anexa o termo a todas via `POST /patrimonio/alocacoes/termo-lote`. Concluído em 17/09/2026.
- [ ] Aceite digital do colaborador (confirmar recebimento pelo próprio portal) — combinado como evolução futura, ainda sem desenho; por ora toda entrega é tratada como aceita assim que registrada.

## 3. Adicionar catálogo, rotas e navegação — concluído em 17/09/2026

- [x] Criar `pages/TiposEquipamentoAdminPage.tsx` para gerenciar os tipos fornecidos aos colaboradores, incluindo a exigência de termo e a ativação.
- [x] Adicionar a página de tipos à área de Configurações e registrar sua rota em `AppRoutes.tsx`.
- [x] Registrar `/patrimonio` e adicionar o item **Equipamentos** em `navigation.ts`, condicionado à rotina `patrimonio`.
- [x] Respeitar o contrato de acesso existente: consultas exigem a rotina; operações de escrita são exclusivas de `ADMIN`. Proteger as rotas e a exibição das ações correspondentes.

Referências: [roteador](../../frontend/src/router/AppRoutes.tsx), [navegação](../../frontend/src/app/layouts/navigation.ts) e [layout de configurações](../../frontend/src/app/layouts/ConfiguracoesLayout.tsx).

## 4. Integrar à gestão de colaboradores — pendente

- [ ] Adicionar à `FichaColaboradorPage.tsx` um bloco com equipamentos/alocações da pessoa, situação atual e histórico.
- [ ] Ao alterar o status do colaborador para `DESLIGADO`, informar na interface que os equipamentos vinculados retornam ao estoque.
- [x] No fluxo de entrega, impedir a seleção de colaboradores desligados e apresentar as rejeições da API de forma compreensível. (`VinculoDialog.tsx` já filtra colaboradores `DESLIGADO`/inativos do seletor e exibe o erro da API se a rejeição ocorrer mesmo assim.)
- [ ] Após desligamento ou movimentação, atualizar os dados exibidos de colaborador, inventário e alocações que forem afetados — falta o bloco da ficha do colaborador para isso valer.

O backend já aciona a devolução ao mudar o status para `DESLIGADO`. A interface deve consumir esse comportamento, sem criar uma segunda devolução independente.

## 5. Validar a entrega e atualizar o contexto — parcial

- [x] Executar os testes de frontend pertinentes aos fluxos novos: listagem, cadastro/filtros, vínculo com colaborador e restrição de ações a `ADMIN` (`PatrimonioPage.test.tsx`, `TiposEquipamentoAdminPage.test.tsx`). Devolução, cancelamento, termo e integração com desligamento **não** têm teste dedicado ainda.
- [x] Executar o build e os testes de frontend (`npx tsc -b`, `npm.cmd test`) — 31 arquivos / 169 testes passando, incluindo os 7 novos.
- [ ] Executar os builds e testes de backend (`npm.cmd test -- --runInBand`, `npm.cmd run build`) — não executados nesta sessão; o módulo de patrimônio no backend não foi alterado.
- [ ] Verificar o estado das migrations no banco de destino. Os planos antigos citavam `20260910000000_patrimonio_equipamentos` e `20260910160000_reserva_telegram_lembrete` como pendentes; confirmar também as posteriores antes de afirmar que o ambiente está atualizado.
- [ ] No fluxo de implantação correspondente, aplicar as migrations que estiverem pendentes e validar acesso à rotina, catálogos e persistência/download dos termos. Confirmar a disponibilidade das telas no ambiente entregue.
- [x] Atualizar [CONTEXT.md](CONTEXT.md) e marcar as tarefas concluídas conforme implementação e validação efetivas.

Comandos disponíveis: `npm.cmd test -- --runInBand` e `npm.cmd run build` em `backend/`; `npm.cmd test` e `npm.cmd run build` em `frontend/`. A consulta de migrations pode ser feita com `npx.cmd prisma migrate status` no backend configurado para o ambiente a verificar. Nenhum desses comandos foi executado nesta consolidação documental.

## Contrato existente a preservar

O backend de patrimônio já está em [backend/src/patrimonio](../../backend/src/patrimonio), registrado no `AppModule` e integrado ao serviço de usuários. A modelagem está no [schema Prisma](../../backend/prisma/schema.prisma).

| Conceito | Estados |
| --- | --- |
| Conservação (`EstadoEquipamento`) | `NOVO`, `BOM`, `REGULAR`, `RUIM`, `DANIFICADO`. |
| Situação do item (`EquipamentoStatus`) | `EM_COMPRA`, `AGUARDANDO_CHEGADA`, `ESTOQUE`, `EM_USO`, `MANUTENCAO`, `BAIXADO`. |
| Alocação/termo (`AlocacaoStatus`) | `PENDENTE`, `ENTREGUE`, `ASSINADO`, `DEVOLVIDO`, `CANCELADA`. |

Um equipamento só pode ter uma alocação ativa por vez. Itens em uso não podem ter sua situação alterada manualmente nem ser desativados sem devolução. O termo pertence à alocação, não ao cadastro do item; anexá-lo marca `ASSINADO`, e removê-lo desfaz essa condição. Registros com histórico têm restrições de exclusão definitiva. A devolução reavalia a conservação do item para a próxima entrega. Nas consultas (não nas chamadas internas entre services), a identidade do colaborador de uma alocação alheia é removida da resposta para quem não é `ADMIN` nem o próprio dono.

| API base | Operações existentes |
| --- | --- |
| `/patrimonio/tipos` | Listar, criar, editar, desativar e excluir definitivamente quando permitido. |
| `/patrimonio/equipamentos` | Listar/filtrar, consultar, criar, editar, desativar e excluir quando permitido; `/resumo` retorna contadores. |
| `/patrimonio/alocacoes` | Listar/filtrar, consultar, criar e editar; `/meus` consulta os itens da pessoa autenticada. |
| `/patrimonio/alocacoes/:id/devolver` e `/:id/cancelar` | Devolver ou cancelar a alocação. |
| `/patrimonio/alocacoes/colaborador/:id/devolver-tudo` | Devolver os equipamentos do colaborador. |
| `/patrimonio/alocacoes/:id/termo` | Enviar, baixar e remover termo; campo multipart `termo`. |
| `/patrimonio/alocacoes/termo-lote` | Anexa um único termo a vários registros de uma vez (`ADMIN`); campo multipart `termo` + `ids` (lista separada por vírgula). |

O contrato não usa prefixo `/v1`; o versionamento do agendamento é específico daquele módulo. Os controllers e DTOs são a referência para métodos, parâmetros e permissões exatos.

## 6. Formulário dinâmico em tipos de solicitação — concluído em 15/09/2026

Implementado: `TipoSolicitacao.usaFormulario` + `camposFormulario` (Json, campos
com id/label/tipo/obrigatório/opções), template reutilizável
(`TemplateFormulario`, módulo `templates-formulario`), preenchimento na tela
de Solicitações (colaborador e admin), drill-down de respostas, formulário
público sem login como um Google Forms — link fixo por **tipo**
(`TipoSolicitacao.permiteLinkPublico`/`tokenLinkPublico`), qualquer pessoa
responde sem cadastro (`Solicitacao.userId`/`registradoPorId` agora
opcionais), rotas `/formulario-publico/:token` sem guard — e relato no
dashboard (contagem + tabela filtrável por tipo/período em
`AdminDashboardPage`). Sem import de planilha nesta v1 (só template). Ver
detalhes de arquitetura em [CONTEXT.md](CONTEXT.md#solicitações) e o registro
completo em [SESSIONS/15-09-2026.md](SESSIONS/15-09-2026.md).

Nota de processo: a primeira entrega interpretou "link público" como um link
por solicitação já criada (só pra continuar editando, com prazo em horas) —
o usuário corrigiu ainda na mesma sessão: o link precisa ser fixo por tipo
(reutilizável, como o Google Forms) e aceitar respostas de qualquer pessoa,
mesmo sem cadastro. O modelo foi refeito (nova migration, DTOs, controllers e
telas) antes de fechar a tarefa; a versão descrita acima é a final.

Pendência conhecida, não implementada: editar um campo do formulário depois
que já existem respostas pode deixar respostas antigas "órfãs" (a resposta
continua salva no Json da solicitação, mas perde o campo correspondente se
ele for removido do tipo) — documentado como limitação aceita, não há
guarda de bloqueio para isso como existe para excluir o tipo inteiro.

## 7. Unificar Turno e Tipo de plantão — concluído em 15/09/2026

`Turno` deixou de existir como entidade: `horaInicio`/`horaFim` agora são
campos do próprio `TipoPlantao` (migration
`20260915140000_merge_turno_em_tipo_plantao`, com backfill a partir dos
plantões já vinculados). Tela única em `/configuracoes/plantoes`
(`TiposPlantaoAdminPage.tsx`) substitui as antigas abas Turnos/Tipos de
plantão; `PlantoesAdminPage.tsx` só pede o Tipo ao criar um plantão. Detalhe
completo, incluindo a coordenação com outra sessão que rodava em paralelo no
mesmo Postgres de dev, em
[SESSIONS/15-09-2026.md](SESSIONS/15-09-2026.md#sessão-seguinte-mesmo-dia-unificar-turno-e-tipo-de-plantão).

## 8. Convites de agenda em massa — concluído em 15/09/2026

Pedido: novo módulo pra criar eventos na agenda dos colaboradores já
conectados ao Google Agenda, com convite em massa (vários destinatários de
uma vez). Antes de agendar, validar se já existe evento no horário e mostrar
a divergência (como o próprio Google Agenda faz). Quem não conectou a Agenda
Google aparece como indisponível, sem poder ser selecionado.

Implementado: módulo `backend/src/convites-agenda/` (`ADMIN`-only, sem
rotina própria), modelos `ConviteAgendaEvento`/`ConviteAgendaDestinatario`
(migration `20260915195810_convites_agenda_eventos`), `GET
/convites-agenda/colaboradores` (lista com `disponivel`), `POST
/convites-agenda/verificar` (divergência antes de criar, via
`GoogleCalendarClient.listarNoIntervalo`, novo), `POST /convites-agenda`
(cria por destinatário, status `CRIADO`/`INDISPONIVEL`/`FALHA`), `PATCH
/convites-agenda/:id` (edita título/descrição/local/horário e propaga pra
quem já tinha o evento, sem mexer em destinatários), `POST
/convites-agenda/:id/reenviar` e `/cancelar`. Reaproveita inteiramente a
autorização e o cliente já existentes em `agenda-google/` — nenhuma mudança
de escopo OAuth. Frontend em `frontend/src/modules/convites-agenda/`, rota
`/convites-agenda`, `ConviteAgendaDialog.tsx` atende criar e editar (mesmo
componente, como `ReservaDialog`). Detalhe completo, incluindo a coordenação
com outra sessão que aplicava uma migration em paralelo no mesmo Postgres de
dev, em
[SESSIONS/15-09-2026.md](SESSIONS/15-09-2026.md#sessão-em-paralelo-mesmo-dia-convites-de-agenda-em-massa).

Não implementado, deliberadamente fora do escopo desta v1: evento único com
organizador/convidados via Google (a implementação entregue criou uma cópia por
destinatário, como plantões/reservas já fazem; o plano posterior para usar o
OAuth do próprio organizador está na seção 11); adicionar ou remover
destinatário de um convite já enviado (editar só muda os dados do evento; pra
mudar quem recebe, cria um convite novo); busca/filtro na lista de colaboradores
do diálogo (lista simples, sem paginação — ok pro tamanho atual do quadro).

## 9. Integração com o Portal Operacional (cs-dash) — planejamento, não iniciado

Plano gerado em 16/09/2026 em
[docs/features/planning/integracao-portal-operacional.md](../docs/features/planning/integracao-portal-operacional.md),
cobrindo a Public API do cs-dash (`../portal`, autenticada por `X-API-Key`) como
ponte de dados nos dois sentidos. **Bloqueado em decisão de produto**: os dois
sistemas não têm um par de entidades óbvio (cs-dash só expõe
companies/contracts/services/tickets; este portal não tem nenhuma dessas). Antes
de abrir tarefa de implementação, decidir qual dado sincroniza e gerar a API Key
no cs-dash com o escopo mínimo correspondente — detalhes e hipóteses no plano.

## 10. Migração de PostgreSQL para MongoDB — planejamento, não iniciado

Plano gerado em 17/09/2026 em
[docs/features/planning/migracao-mongodb.md](../docs/features/planning/migracao-mongodb.md).
A recomendação é preservar Prisma, o modelo normalizado, os UUIDs e os contratos
HTTP; usar MongoDB em replica set; substituir `Decimal` por centavos inteiros; e
fazer o corte com manutenção e rollback para PostgreSQL. O upgrade de Prisma 5.19
para 6.19 deve ocorrer antes, isoladamente e ainda sobre PostgreSQL. Antes de
implementar, decidir Atlas versus self-hosted, confirmar a janela de manutenção e
executar a prova técnica descrita nas fases 0 e 1 do plano.

## 11. Convites de Agenda Google por e-mail — implementado (Fases 1–3), desligado por flag

Plano gerado em 17/09/2026 em
[docs/features/planning/convites-agenda-por-email.md](../docs/features/planning/convites-agenda-por-email.md),
implementado na mesma data. `ConviteAgendaEvento.modo=EVENTO_COM_CONVIDADOS`
substitui, para novos convites, as cópias individuais na agenda de cada
destinatário por um evento único na agenda do administrador organizador
(`req.user.id`), com convidados informados por e-mail e `sendUpdates=all`.
Somente o organizador precisa conectar a Agenda; destinatários não precisam
de cadastro nem conexão no portal. Convites antigos (`COPIAS_INDIVIDUAIS`)
continuam consultáveis, editáveis e canceláveis pelo fluxo legado. Detalhe
completo da implementação em
[SESSIONS/17-09-2026.md](SESSIONS/17-09-2026.md#convites-de-agenda-por-e-mail-implementação).

- [x] Migration, DTOs, `GoogleCalendarClient` (`criarComConvidados`,
      `atualizarComConvidados`, `cancelarComConvidados`, `obterComConvidados`,
      `consultarLivreOcupado`), `ConvitesAgendaService`/`Controller`
      reescritos, testes de backend e frontend, documentação.
- [x] Google Meet opcional por convite (`comMeet`, checkbox "É uma reunião?"
      na criação) — usuário reportou que o evento criado não virava reunião
      do Meet; detalhe em
      [SESSIONS/17-09-2026.md](SESSIONS/17-09-2026.md#google-meet-opcional-nos-convites-de-agenda).
      Migration `20260917130000_convites_agenda_com_meet` escrita à mão
      (sem Postgres acessível neste ambiente para `prisma migrate dev`) —
      **pendência operacional: rodar `prisma migrate deploy` no ambiente com
      o banco antes do próximo deploy.**
- [ ] **Fase 0 do plano — prova manual, não executada.** Exige uma conta real
      do Google Workspace e dois destinatários de teste (um do domínio sem
      conexão com o portal, outro sem cadastro algum) para confirmar entrega,
      RSVP, cancelamento e Free/Busy conforme as políticas reais do domínio —
      trabalho operacional, não de código; ninguém neste ambiente tem acesso a
      essa conta.
- [ ] **Fase 4 do plano — ativação controlada, não executada.** Por isso
      `GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED=false` por padrão: `POST
      /convites-agenda` recusa criar convites no modo novo até a flag ser
      ligada, depois que a Fase 0 validar o comportamento real do Workspace
      usado em produção.

## 12. Recorrência automática de plantão por tipo — concluído em 17/09/2026

Pedido: na criação do tipo de plantão, escolher os dias da semana quando
recorrente semanal, pra ter plantões futuros gerados automaticamente,
sozinhos e sem plantonista, "daqui em diante" (sem precisar de data final
manual); cancelamento por escopo como o Google Agenda (este / todos / este e
os seguintes); confirmar integração com a Agenda Google.

Implementado: `TipoPlantao.diasSemana` (config única, migrada pra cá — antes
era escolhida a cada lote na tela de Plantões) + `TipoPlantao.criadoPorId`
(autor usado nas séries abertas automaticamente). `PlantoesRecorrenciaWorker`
(cron diário) mantém uma `PlantaoSerie` aberta (`dataFim` agora opcional,
`null` = sem fim) por tipo ativo recorrente e completa ocorrências futuras
numa janela rolante de 90 dias, sempre sem plantonista/`RASCUNHO`. `POST
/plantoes` sem `dataFim` virou sempre uma ocorrência avulsa (qualquer tipo,
inclusive recorrente — cobertura extra/feriado), removendo os campos "Data
final da recorrência"/"Dias da semana" da tela de criação de plantão.
Cancelamento por escopo: `DELETE /plantoes/:id` agora cancela (soft,
`PlantaoStatus.CANCELADO` novo) em vez de apagar quando o plantão pertence a
uma série — evita que o worker recrie a data — e continua apagando de
verdade plantões avulsos; novo `PATCH
/plantoes/serie/:serieId/encerrar-apartir` cancela uma ocorrência e todas as
seguintes da série; `DELETE /plantoes/serie/:serieId` (excluir toda a série)
não mudou. Sobre a Agenda Google: já era automática por plantonista
individual antes desta tarefa (confirmado com o usuário) — nada foi alterado
aí, só reaproveitada (cancelar via `CANCELADO` já limpa o evento sozinho,
porque `destinatario()` exige `PUBLICADO`).

Detalhe completo, incluindo a decisão de manter "Novo plantão" pra
ocorrências avulsas mesmo em tipos recorrentes, em
[SESSIONS/17-09-2026.md](SESSIONS/17-09-2026.md#recorrência-automática-de-plantão-por-tipo).

Pendência conhecida, não implementada: editar `diasSemana` de um tipo não
retro-limpa ocorrências futuras já geradas pelo padrão antigo e ainda sem
plantonista — ficam soltas até o admin cancelar manualmente pela tela
(simplificação deliberada, ver comentário `ponytail:` em
`plantoes-recorrencia.worker.ts`).

## 13. Módulo de logs da aplicação — implementado em 17/09/2026

Plano em
[docs/features-planning/logs-aplicacao.md](../docs/features-planning/logs-aplicacao.md),
implementado na mesma data seguindo as cinco fases do plano. Detalhe de
arquitetura e API em [docs/reference/logs-aplicacao.md](../docs/reference/logs-aplicacao.md)
e em [CONTEXT.md](CONTEXT.md#logs-da-aplicação); registro completo da sessão em
[SESSIONS/17-09-2026.md](SESSIONS/17-09-2026.md#módulo-de-logs-da-aplicação-implementação).

- [x] `LogAplicacao`/`LogAplicacaoControle`/`LogAplicacaoResultado` no schema,
      service com rotação transacional protegida por advisory lock.
- [x] Middleware global (`requestId`, contexto, `X-Request-Id`) e exception
      filter global (`@Catch()` estendendo `BaseExceptionFilter`) capturando
      toda requisição elegível sem alterar a resposta original.
- [x] Sanitização: nunca persiste body, query string, headers completos,
      cookies, tokens/senhas ou parâmetros concretos de rota; remove padrões
      de segredo de mensagem/stack e trunca por tamanho.
- [x] `GET /logs-aplicacao` (filtros + estado do ciclo) e `GET
      /logs-aplicacao/:id`, `ADMIN`-only, sem rotina própria.
- [x] Frontend em `frontend/src/modules/logs-aplicacao/`, rota `/logs`, item
      **Logs** no menu (`adminOnly`), atualização automática (10s) e manual,
      diálogo de detalhe com stack sanitizado.
- [x] Testes: backend 48 casos novos (sanitizer, service — inclusive a virada
      100→1 e a ordem lock-antes-de-ler —, middleware, exception filter) e
      frontend 7 casos na página; suítes completas de backend (477 testes,
      1 falha pré-existente e alheia: `prisma.service.spec.ts` exige Postgres
      real) e frontend (187 testes, 1 falha pré-existente e alheia:
      `App.test.tsx` — confirmada via stash, já falha na `main` sem esta
      mudança) e ambos os builds passando.
- [ ] Migration `20260917200000_add_logs_aplicacao` escrita à mão (sem
      Postgres acessível neste ambiente) — **pendência operacional: rodar
      `prisma migrate deploy` no ambiente com o banco antes do próximo
      deploy**, e então validar manualmente um ciclo completo (101
      requisições) contra o banco real.

## 14. Solicitação de reserva de sala pelo colaborador — implementada em 17/09/2026

Plano e contrato de continuidade em
[docs/features/planning/solicitacao-reserva-sala-colaborador.md](../docs/features/planning/solicitacao-reserva-sala-colaborador.md).

- [x] Criar a configuração global `AgendamentoConfig.permiteSolicitacaoColaborador`, desligada por padrão, com leitura pela rotina `agendamentos` e alteração exclusiva de `ADMIN`.
- [x] Criar `POST /v1/agendamento/reservas/minhas`, impondo o usuário autenticado como solicitante e o status `SOLICITADA`, sem aceitar campos administrativos do cliente.
- [x] Permitir que o colaborador cancele somente a própria solicitação ainda pendente em `POST /v1/agendamento/reservas/:id/cancelar-minha`.
- [x] Expor o controle em *Configurações → Salas* e o formulário pessoal reduzido na agenda somente quando habilitado.
- [x] Fazer a solicitação ocupar o horário, avisar solicitante e administradores e sincronizar a Agenda Google somente depois da confirmação.
- [x] Cobrir serviço, autorização e interface; os testes direcionados finais passaram (74 backend e 24 frontend) e o build do frontend passou. A suíte completa do frontend chegou a passar com 175 testes antes das mudanças concorrentes em `convites-agenda`; a repetição final ficou com 9 falhas somente no teste desse módulo externo à tarefa.
- [ ] Aplicar nos ambientes de destino a migration `20260917044610_permite_solicitacao_sala_colaborador`. Ela foi gerada com `prisma migrate dev --create-only` e não foi aplicada ao banco local compartilhado porque há outras migrations sendo desenvolvidas por agentes em paralelo.

## 15. Foto de perfil via Google — implementado em 17/09/2026, migration pendente

Pedido: usuário quer que a foto da conta Google apareça no portal, já que o
login é feito por ela.

Implementado: `User.avatarUrl` (novo, opcional) recebe o campo `picture` do
ID token do Google — extraído em `GoogleAuthService.verifyCredential`
(`PerfilGoogle.foto`) e gravado por `AuthService` no primeiro login/vínculo
e atualizado nos logins seguintes se a foto mudar (login por senha não
altera o campo). `/users/me` expõe `avatarUrl`; o header do frontend
(`UserDropdown.tsx`) mostra a foto no círculo da conta, caindo para a
inicial do nome quando não existe. De caminho, foi removido um bloco de
botão duplicado que estava colado por engano dentro do painel do dropdown
(renderizava avatar/nome/chevron uma segunda vez, invisível por ser texto
branco sobre fundo claro) e o botão "Sair" passou a usar
`--color-danger`/`--color-danger-soft` (mesmo padrão de `Button.tsx`
variante `danger`), a pedido do usuário.

- [x] Backend: schema, `GoogleAuthService`, `AuthService` (login/provisionamento/vínculo), `SELECT_PUBLICO` em `users.service.ts`.
- [x] Frontend: `AuthUser.avatarUrl`, `UserDropdown.tsx` (foto + fallback de inicial, remoção do botão duplicado, "Sair" em vermelho).
- [x] Testes: `google-auth.service.spec.ts` atualizado para o campo `picture`/`foto`; suíte de `src/auth` e `src/users` (74 testes) e `tsc --noEmit` do frontend passando.
- [ ] **Pendência operacional: rodar `prisma migrate deploy`** no ambiente com banco real para aplicar `20260917230000_add_user_avatar_url` (escrita à mão — sem Postgres acessível neste ambiente, mesma limitação já registrada nos itens 11/13/14). Sem isso, quem já tem conta vinculada só ganha a coluna/foto depois do deploy + próximo login.

## 16. Papel MASTER (administração de plataforma) — implementado em 17/09/2026

Pedido: um papel acima de `ADMIN`, para administração da própria plataforma
(começando pelo módulo de logs da aplicação, item 13), que não aparece na
lista de colaboradores e só pode ser criado por outro master, com "poder
total" — inclusive apagar registros que uma regra de negócio normalmente
bloqueia (ex.: reservas de sala já encerradas). Login padrão
`admin@suri.ai` / `@@@@@@1234567890`; o usuário avisou que em produção já
existe uma conta com esse e-mail/senha, então a migration deveria promovê-la
em vez de recriá-la.

**Hierarquia, não papel isolado.** `Role` ganhou `MASTER`
(`ADMIN < MASTER`... na prática `USER < ADMIN < MASTER`), resolvida por
`satisfazRole`/`ehAdminOuSuperior` (`backend/src/auth/roles.util.ts`,
espelhado no frontend por `satisfazRole` em `frontend/src/types/auth.types.ts`)
— documentado como convenção nova em
`AI/SKILLS/BACKEND/autenticacao-e-autorizacao.md`. `RolesGuard` e
`PermissoesService.resolveRotinas` passaram a usar essa hierarquia, então
`@Roles('ADMIN')` já deixa `MASTER` passar sem listar os dois papéis; todo
`role === 'ADMIN'`/`!== 'ADMIN'` solto em service/controller do backend (9
arquivos: `documentos`, `dependentes`, `onboarding`, `treinamentos`,
`solicitacoes`, `patrimonio` × 2, `plantoes`) e no frontend (`DashboardPage`,
`AgendamentosPage`, `PatrimonioPage`) foi trocado pelo helper, para o master
herdar automaticamente tudo que já era permitido a um admin, em vez de ficar
de fora de checagens específicas.

**Invisível para quem não é master.** `UsersService.findAll` exclui
`role=MASTER` da listagem de colaboradores por padrão (só um master vê
outro master); `findOne`/`update`/`remove`/`deletePermanently` devolvem o
mesmo 404 de "não encontrado" para um alvo master quando quem chama não é
master, em vez de 403 (não confirma nem que o id existe). O DTO de
colaborador (`CreateUserDto`/`UserRole`) não inclui `MASTER` — a única forma
de criar um master é `POST /users/masters` (`CreateMasterUserDto`: nome,
e-mail, senha — sem os campos de RH), exclusivo de `@Roles('MASTER')`.

**Seed/promoção do master padrão.** Duas migrations, obrigatoriamente
separadas (Postgres não deixa usar um valor de enum na mesma transação em
que ele foi adicionado): `20260917220000_add_master_role` (`ALTER TYPE
"Role" ADD VALUE 'MASTER'`) e `20260917220100_promove_master_admin_suri`
(`INSERT ... ON CONFLICT ("email") DO UPDATE SET "role" = 'MASTER'` para
`admin@suri.ai` — promove sem tocar em senha/demais dados se o e-mail já
existir, como no ambiente de produção do usuário; cria com a senha padrão
em hash caso contrário). Hash bcrypt pré-computado (custo 12, mesmo padrão
de `seed-production.ts`) porque migration não roda código Node.
`backend/prisma/seed.ts` (dev) ganhou o mesmo upsert, custo 10.

**Frontend.** `frontend/src/modules/master/` (`MasterUsuariosPage.tsx`,
lista + criação) na rota `/master/usuarios`, e `/logs` (logs da aplicação,
item 13) virou `masterOnly` em vez de `adminOnly` — nem admin comum acessa
mais. `NavItem` ganhou `masterOnly`; `ProtectedRoute` e `AppShell` usam a
hierarquia. Em `/agendamentos`, uma reserva confirmada já encerrada (estado
`FINALIZADA`) ganhou um botão **Excluir** visível só para master — a API
(`ReservasService.remove`) nunca teve essa restrição, só a tela escondia a
ação para todo mundo; não foi preciso mudar o backend, só revelar a ação já
suportada.

**Escopo deliberadamente não coberto**, por falta de especificação: quais
outros módulos além de logs-aplicacao deveriam ficar `masterOnly` (só esse
foi pedido explicitamente) e outras regras de negócio "que normalmente não
podem" além das duas citadas (reservas encerradas, cobertas; solicitações já
permitiam exclusão irrestrita mesmo antes desta tarefa, então nada mudou
lá). Se surgir um caso concreto novo, o padrão é: guard/rota vira
`@Roles('MASTER')` quando exclusivo, ou a checagem específica ganha um
`if (chamador.role === 'MASTER') { /* bypass */ }` pontual perto da regra
que ela ignora — não um bypass genérico global.

- [x] Backend: enum `MASTER`, duas migrations, `roles.util.ts`, `RolesGuard`/`PermissoesService` com hierarquia, sweep dos 9 arquivos com `role === 'ADMIN'` literal, `UsersService`/`UsersController` (`findAll` mascarado, 404 para alvo master, `POST/GET /users/masters`), `logs-aplicacao.controller.ts` para `@Roles('MASTER')`, seed de dev.
- [x] Frontend: `UserRole`/`satisfazRole`, `ProtectedRoute`/`AppShell`/`navigation.ts` com hierarquia e `masterOnly`, módulo `master/` completo, rota `/master/usuarios`, exclusão de reserva encerrada em `AgendamentosPage.tsx`.
- [x] Testes: `roles.util.spec.ts` (novo), `roles.guard.spec.ts` (+3 casos de hierarquia), `users.service.spec.ts` (+7 casos de master, chamador roteado em todas as chamadas existentes), `ProtectedRoute.test.tsx` (+3 casos), `AgendamentosPage.test.tsx` (+1 caso, com a pegadinha de fake timers travando `userEvent` documentada no próprio teste). Suíte completa: backend 39 arquivos (só a falha pré-existente de `prisma.service.spec.ts`, sem Postgres); frontend 34 arquivos (só a falha pré-existente de `App.test.tsx`, confirmada via `git stash` que já existia antes desta tarefa). Ambos os builds (`tsc -b`/`nest build`) limpos.
- [ ] **Pendência operacional: rodar `prisma migrate deploy`** das duas migrations novas no ambiente com banco real antes do próximo deploy — sem isso, `admin@suri.ai` não vira master em produção. Confirmar depois que o login com `admin@suri.ai`/`@@@@@@1234567890` funciona e que a conta some da listagem de colaboradores para um `ADMIN` comum.
- [ ] Trocar a senha padrão do master (`@@@@@@1234567890`) por uma definitiva assim que possível — é um valor conhecido publicamente agora que está registrado aqui e na migration.
