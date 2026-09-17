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

## 13. Módulo de logs da aplicação — planejamento, não iniciado

Plano gerado em 17/09/2026 em
[docs/features-planning/logs-aplicacao.md](../docs/features-planning/logs-aplicacao.md).
A proposta registra as requisições HTTP recebidas pelo backend, associa o usuário
quando autenticado, guarda detalhes sanitizados de erros e oferece uma tela
exclusiva de `ADMIN`. O histórico trabalha em ciclos: mantém 100 entradas e, na
requisição elegível seguinte, apaga o lote anterior e inicia o próximo ciclo em
1. A consulta do próprio módulo e requisições `OPTIONS` ficam fora da contagem.

Antes de implementar, preservar as decisões de segurança do plano: não armazenar
body, resposta, cookies, tokens, headers completos, query string nem parâmetros
concretos de rota. A virada do ciclo precisa ser atômica mesmo com requisições
concorrentes e múltiplas réplicas.

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
