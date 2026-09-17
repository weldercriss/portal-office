# Plano: migração de PostgreSQL para MongoDB

Status: **planejamento, nada implementado**. Levantamento feito em 17/09/2026
com base no schema, serviços, testes, Compose, deploy e backup existentes neste
checkout.

## 1. Resumo executivo

A migração é tecnicamente possível sem trocar NestJS nem reescrever o frontend,
mantendo o Prisma como camada de acesso. Porém, não é uma simples mudança de
`provider`: o sistema atual é fortemente relacional e depende de integridade
referencial, índices únicos com valores nulos, `Decimal`, migrations SQL,
transações multi-registro e backup do PostgreSQL.

Recomendação para reduzir o risco:

1. preservar o desenho normalizado atual (uma collection por model), em vez de
   aproveitar a troca para embutir documentos;
2. preservar todos os IDs UUID já expostos pela API, mapeando cada `id` para
   `_id` no MongoDB;
3. atualizar Prisma 5.19 para 6.19 em uma entrega isolada ainda sobre PostgreSQL,
   estabilizá-la e só então iniciar a troca de banco;
4. usar MongoDB em **replica set** desde o desenvolvimento, porque o backend tem
   transações multi-documento;
5. substituir `Prisma Migrate` por migrations Mongo versionadas e idempotentes,
   responsáveis principalmente por índices e backfills;
6. executar a virada com uma janela curta de manutenção, exportação final,
   validação e rollback pronto para o PostgreSQL.

Este plano parte da hipótese de que uma janela de manutenção é aceitável para o
portal interno. Se a exigência for zero downtime, será necessária uma fase extra
de CDC ou dual-write, detalhada na seção 8.4.

## 2. Diagnóstico do estado atual

O arquivo `backend/prisma/schema.prisma` possui:

- 42 models e 18 enums;
- 71 declarações de relação;
- 23 constraints/índices únicos e 22 índices explícitos;
- 36 migrations SQL no histórico;
- dois campos monetários `Decimal @db.Decimal(12, 2)`:
  `User.salario` e `Equipamento.valorAquisicao`;
- quatro campos opcionais com `@unique`: `User.googleSub`,
  `TipoSolicitacao.tokenLinkPublico`, `Equipamento.numero` e
  `Equipamento.numeroSerie`.

No código em runtime existem 11 usos de `$transaction`, distribuídos por
usuários, permissões, plantões, salas, patrimônio e filas de sincronização da
Agenda Google. Há também uma query SQL crua no healthcheck (`SELECT 1`), que não
funciona no conector MongoDB.

Outros pontos operacionais acoplados ao PostgreSQL:

- `backend/docker-compose.yml` e `docker-compose.prod.yml` sobem
  `postgres:16-alpine`;
- `backend/docker-entrypoint.sh` executa `prisma migrate deploy`;
- `scripts/backup.sh` usa `pg_dump`;
- `.env.example`, documentação e healthchecks pressupõem a URL PostgreSQL;
- seeds usam Prisma e tendem a continuar válidos, mas precisam ser revalidados
  contra os novos índices.

### 2.1 O que pode continuar igual

- controllers, DTOs, guards, rotas HTTP e contrato geral do frontend;
- services acessando `PrismaService` diretamente;
- relations normalizadas pelo Prisma, `Json`, enums, arrays e datas;
- `findMany`, `include`, filtros relacionais, `groupBy`, `createMany`,
  `updateMany` e buscas case-insensitive, sujeitos à validação por testes;
- armazenamento dos uploads em volume separado do banco.

### 2.2 Diferenças que exigem projeto explícito

- MongoDB não oferece foreign keys. No `relationMode = "prisma"`, parte das
  ações referenciais é emulada pelo Prisma, mas uma criação que informa apenas
  o ID relacionado pode produzir órfãos. Escritas fora do Prisma também não
  recebem essa proteção. Portanto, cada relação precisa de índice e as
  invariantes de domínio precisam continuar validadas nos services.
- O conector MongoDB do Prisma não usa `prisma migrate`; a orientação oficial é
  `db push`. Neste projeto, `db push` sozinho não é suficiente, porque não
  representa índices únicos parciais nem fornece um histórico operacional de
  backfills. A produção deve receber migrations próprias, versionadas.
- `Decimal` não é suportado pelo conector. Valores monetários precisam de outra
  representação.
- MongoDB diferencia campo ausente de campo com `null`; o Prisma devolve ambos
  de forma parecida, mas filtros podem ter resultados diferentes.
- Transações MongoDB exigem replica set. Um `mongod` standalone não atende este
  projeto.

Referências oficiais: [conector MongoDB e versão suportada do Prisma](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mongodb),
[relation mode do Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/relation-mode),
[transações no Prisma v6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions),
[migrations e MongoDB](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/overview)
e [índices únicos no MongoDB](https://www.mongodb.com/docs/manual/core/index-unique/).

## 3. Decisões de arquitetura propostas

### 3.1 Manter Prisma e o modelo normalizado

Cada model atual continua como collection própria e as referências continuam em
campos como `userId`, `groupId` e `tipoId`. Não embutir departamentos, reservas,
alocações ou notificações nesta migração.

Motivos:

- preserva a API e a maior parte das aproximadamente 350 operações Prisma
  encontradas nos services;
- evita duplicação e documentos sem limite de crescimento;
- permite comparar PostgreSQL e MongoDB entidade por entidade;
- separa a troca de tecnologia de uma futura otimização de modelagem.

Embeddings podem ser avaliados depois, guiados por métricas de consulta. Não são
pré-requisito para usar MongoDB.

### 3.2 Preservar UUIDs

Usar, em todos os models:

```prisma
id String @id @default(uuid()) @map("_id")
```

Os campos de relação permanecem `String`, sem `@db.ObjectId`. Assim, o ETL pode
copiar os IDs atuais sem criar tabelas de correspondência, e URLs, tokens,
vínculos com Agenda Google, testes e referências do frontend não mudam. O uso de
`ObjectId` seria idiomático em uma aplicação nova, mas traria risco sem benefício
proporcional nesta migração.

### 3.3 Representar dinheiro em centavos

Substituir os campos persistidos por inteiros em centavos:

- `User.salarioCentavos Int?`;
- `Equipamento.valorAquisicaoCentavos Int?`.

O ETL converte exatamente `decimal * 100`, rejeitando valores com mais de duas
casas ou fora do intervalo. A camada HTTP mantém o contrato atual: salário segue
como string decimal e valor de aquisição como número, com funções centrais de
conversão. Não usar `Float`, pois arredondamento binário é inadequado para
dinheiro. Se o levantamento de produção encontrar valor acima do limite seguro
de `Int`, trocar essa decisão para `BigInt` e adicionar serialização explícita
antes da implementação.

### 3.4 Índices e unicidade

Adicionar `@@index` a todo campo escalar usado em `@relation`; o MongoDB não cria
índices de foreign key automaticamente. Revisar ainda os filtros e ordenações de
workers, reservas, plantões, solicitações e patrimônio para criar índices
compostos pela ordem real de consulta.

Os campos opcionais únicos exigem atenção especial. Um índice único comum do
MongoDB trata `null`/ausência como uma entrada e permite apenas uma ocorrência.
Para preservar a semântica PostgreSQL de "vários nulos, valores preenchidos
únicos", criar índices únicos parciais nativos, por exemplo:

```javascript
db.User.createIndex(
  { googleSub: 1 },
  {
    name: "User_googleSub_unique_when_string",
    unique: true,
    partialFilterExpression: { googleSub: { $type: "string" } },
  },
)
```

Aplicar o mesmo padrão a `tokenLinkPublico`, `numero` e `numeroSerie`. Como o
schema Prisma não expressa esses índices parciais, eles pertencem ao mecanismo de
migration descrito na seção 5. `db push` não deve ser executado automaticamente
em produção depois disso, pois pode introduzir drift ou tentar recriar os índices
com outra semântica.

### 3.5 `null` versus campo ausente

O importador deve escrever explicitamente `null` para todos os campos opcionais
que hoje estão nulos no PostgreSQL. Para evoluções futuras:

- adicionar campos novos primeiro como opcionais;
- executar backfill versionado;
- somente depois tornar o campo obrigatório, se necessário;
- usar `isSet` nos filtros que realmente precisam incluir documentos antigos sem
  o campo.

Cobrir especialmente os filtros atuais em datas de aniversário, usuário de
plantão, usernames do Telegram e pendências da Agenda Google.

## 4. Schema MongoDB proposto

Criar o schema Mongo numa branch de migração e validar com `prisma validate` e
`prisma generate` antes de tocar em dados.

Alterações mecânicas esperadas:

1. `provider = "mongodb"` e `relationMode = "prisma"` no datasource;
2. `@map("_id")` em todos os 42 IDs, mantendo `String`/UUID;
3. remoção de `@db.Decimal(12, 2)` e adoção dos campos em centavos;
4. índices explícitos para todos os campos de relação e queries críticas;
5. revisão das ações `Cascade`/`SetNull` e testes de exclusão;
6. manutenção das relações explícitas do Prisma, embora o banco não possua
   foreign keys;
7. documentação, fora do schema, dos quatro índices únicos parciais.

Antes de fechar esta fase, gerar o client e compilar o backend. Isso revela
operações que não sejam suportadas pelo conector, em vez de descobri-las durante
o corte.

## 5. Evolução de schema sem Prisma Migrate

Criar um mecanismo pequeno e próprio, sem editar o banco manualmente:

```text
backend/prisma/mongo-migrations/
  001-bootstrap-indexes.ts
  002-exemplo-backfill.ts
backend/prisma/run-mongo-migrations.ts
```

O runner deve:

- registrar cada versão aplicada em `_app_migrations` com nome, checksum e data;
- adquirir um lock para impedir dois backends de aplicar migrations ao mesmo
  tempo;
- ser idempotente e falhar se o checksum de uma versão aplicada mudar;
- criar/alterar índices com comandos nativos, incluindo índices parciais;
- executar backfills em lotes, com checkpoint quando o volume justificar;
- emitir logs sem connection strings ou dados pessoais;
- ter testes contra um MongoDB temporário em replica set.

O entrypoint passa a executar `run-mongo-migrations` antes da aplicação, no lugar
de `prisma migrate deploy`. `prisma db push` fica restrito a prototipação/ambiente
descartável e nunca substitui as migrations versionadas de produção.

Também será necessário atualizar a regra do repositório em
`AI/SKILLS/DATABASE/migrations.md` quando a implementação ocorrer: a regra atual
é correta para PostgreSQL, mas não para o conector MongoDB.

## 6. Infraestrutura local e produção

### 6.1 Ambiente local

Trocar o serviço PostgreSQL por MongoDB em replica set de um nó, com healthcheck
que valide tanto `ping` quanto a existência de um primary. A inicialização deve
ser automatizada e repetível; não depender de um comando manual em `mongosh`
depois de cada volume novo.

A URL local deve incluir banco, autenticação, `replicaSet` e, quando necessário,
`directConnection=true`. Atualizar `backend/.env.example` sem incluir credenciais
reais.

### 6.2 Produção

Decidir antes da implementação entre:

- **MongoDB Atlas**: recomendado operacionalmente por já oferecer replica set,
  monitoramento, backups e atualização gerenciada;
- **self-hosted no EC2**: menor mudança de fornecedor, mas exige operar replica
  set, autenticação, keyfile, disco, restauração, monitoramento e atualização.

Se for self-hosted, não considerar replica set de um nó como alta disponibilidade:
ele habilita transações, mas a queda do nó continua derrubando o banco. Para
produção resiliente são necessários membros em domínios de falha distintos.

Em qualquer opção:

- remover dependência do serviço `postgres` no Compose de produção;
- fornecer `DATABASE_URL` como segredo e não interpolá-la em logs;
- ajustar `start_period` para migrations/backfills;
- validar pool e limites de conexão do Prisma;
- incluir estado do replica set e latência do banco na monitoração.

### 6.3 Healthcheck e backup

Substituir `SELECT 1` por um comando Mongo (`ping`) via API suportada pelo Prisma
ou driver usado pelo runner.

Para self-hosted, trocar `pg_dump` por `mongodump --oplog` e validar restauração
com `mongorestore --oplogReplay`; uploads continuam em arquivo separado. Um dump
sem `--oplog` não representa necessariamente um ponto consistente enquanto há
escritas. No Atlas, configurar a política de snapshot/PITR do serviço e manter o
backup de uploads coordenado com o ponto de restauração do banco.

Referências: [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/),
[mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/) e
[backup consistente](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/).

## 7. Ferramenta de migração de dados

Criar um ETL dedicado em `backend/scripts/migrate-postgres-to-mongo/`, sem
reaproveitar os seeds. Durante a transição, manter dois schemas/clientes Prisma:

- snapshot somente leitura do schema PostgreSQL, gerando um client legado em
  diretório próprio;
- schema MongoDB, gerando o client de destino em outro diretório.

O ETL deve:

1. fazer preflight no PostgreSQL: contagem por tabela, duplicidades, relações
   órfãs, valores monetários inválidos, nulos e tamanho dos JSONs;
2. criar/aplicar os índices não únicos necessários no destino;
3. copiar collections em ordem topológica e em lotes, preservando IDs e datas;
4. transformar os dois campos monetários em centavos;
5. gravar `null` explicitamente para campos opcionais;
6. usar upsert por `_id`, permitindo reexecução segura;
7. criar os índices únicos somente depois de carregar e validar os dados;
8. produzir relatório sem dados pessoais, com contagens, duração, rejeições e
   checkpoints;
9. falhar a execução diante de qualquer registro rejeitado, em vez de seguir com
   perda silenciosa.

Não usar `mongoimport` para o corte principal: ele não conhece as relações nem as
transformações de dinheiro e datas. Manter `pg_dump` do estado pré-corte como
artefato de rollback.

## 8. Estratégia de implantação

### 8.1 Ensaio

1. restaurar uma cópia sanitizada e recente da produção em ambiente isolado;
2. executar o ETL completo e medir duração;
3. aplicar migrations/índices Mongo;
4. executar validação automática e smoke tests com a aplicação apontando apenas
   para o MongoDB;
5. destruir e repetir o ensaio do zero para comprovar reprodutibilidade;
6. realizar ao menos um exercício de restore do backup Mongo.

### 8.2 Corte recomendado com manutenção

1. anunciar e iniciar modo de manutenção, bloqueando todas as escritas e os
   workers agendados;
2. gerar backup final do PostgreSQL e dos uploads;
3. executar a carga final PostgreSQL → MongoDB;
4. criar índices únicos parciais e executar validações;
5. publicar backend/Compose configurados para MongoDB;
6. validar healthcheck, login, permissões e fluxos críticos;
7. liberar tráfego e monitorar erros, latência e filas;
8. manter o PostgreSQL intacto e somente leitura durante o período de
   estabilização definido pela equipe.

Não fazer escrita simultânea nos dois bancos durante essa estratégia. Isso evita
divergência e deixa o rollback objetivo.

### 8.3 Rollback

Enquanto não houver escrita no MongoDB, basta apontar a aplicação de volta para
o PostgreSQL e usar a imagem anterior. Depois que o tráfego for liberado:

- se o problema ocorrer dentro da janela de validação, ativar manutenção antes
  de qualquer rollback;
- decidir se as novas escritas Mongo serão descartadas ou convertidas de volta;
- não religar o PostgreSQL sem reconciliar essas escritas;
- preservar logs e o banco Mongo para análise.

O runbook deve definir nominalmente quem toma a decisão, o limite de tempo e os
critérios de rollback antes do corte.

### 8.4 Alternativa sem downtime

Se manutenção não for aceita, acrescentar uma etapa de CDC PostgreSQL → MongoDB,
backfill com captura de mudanças, verificação de lag e troca coordenada de leitura.
Dual-write dentro dos services é a alternativa menos indicada: espalha lógica de
consistência por vários domínios e torna falhas parciais difíceis de recuperar.
Essa variante precisa de desenho e infraestrutura próprios; não deve ser tratada
como pequeno ajuste do plano recomendado.

## 9. Validação funcional e de dados

### 9.1 Validação do ETL

- igualdade de contagem por model;
- igualdade de IDs e chaves únicas preenchidas;
- zero referências órfãs para as 71 relações;
- igualdade dos valores monetários após ida e volta centavos ↔ decimal;
- hashes determinísticos por collection sobre campos de negócio normalizados;
- comparação de amostras e casos de borda: nulos, arrays, JSON de formulários,
  datas UTC e tokens criptografados;
- conferência dos índices esperados no catálogo do MongoDB.

### 9.2 Regressão do backend

Além da suíte Jest e do build, criar testes de integração com MongoDB real em
replica set para:

- autenticação por senha e Google, refresh e acesso desativado;
- resolução de rotinas por departamento e override individual;
- criação/exclusão em cascade e `SetNull`;
- criação de série de plantões e aceite de troca;
- substituição das disponibilidades de sala e bloqueio de sobreposição;
- entrega, troca, devolução e desligamento com devolução de patrimônio;
- outboxes da Agenda Google e reservas;
- campos opcionais únicos com vários documentos sem valor;
- filtros de `null`/campo ausente;
- formulários dinâmicos e respostas `Json`;
- resumo de patrimônio por status;
- healthcheck e seeds.

Os testes unitários atuais mockam Prisma e não detectam diferenças entre
connectors; por isso essa suíte de integração é requisito de go-live.

### 9.3 Smoke test após o corte

- login de `ADMIN` e `USER`;
- listagem e edição de colaborador;
- permissões e menus;
- solicitação autenticada e formulário público;
- criação de plantão e reserva;
- notificação interna;
- operação de patrimônio;
- leitura das filas e estado das conexões Google;
- upload e download de um arquivo de teste;
- reinício do backend sem reaplicar migration indevidamente.

## 10. Fases e entregáveis

### Fase 0 — decisão e baseline

- decidir Atlas versus self-hosted e confirmar janela de manutenção;
- medir volume, crescimento, índices usados e duração aceitável do corte;
- registrar a versão exata de MongoDB;
- atualizar Prisma 5.19 para 6.19 ainda com PostgreSQL, executar a regressão e
  publicar essa atualização separadamente antes da migração de banco;
- congelar contrato externo e obter baseline de testes/build.

**Saída:** ADR curto com decisões operacionais e critérios de sucesso.

### Fase 1 — prova técnica

- converter uma cópia do schema;
- validar geração do client e build;
- provar UUID em `_id`, dinheiro em centavos, transações, cascades, índices
  parciais, `groupBy`, `createMany` e filtros nulos;
- testar replica set local automatizado.

**Saída:** spike descartável e lista fechada de incompatibilidades.

### Fase 2 — persistência e infraestrutura

- implementar schema Mongo definitivo;
- implementar runner de migrations e índices;
- adaptar healthcheck, entrypoint, Compose, `.env.example`, backup e restore;
- atualizar documentação e micro skills de banco.

**Saída:** aplicação vazia sobe do zero em MongoDB e reinicia com segurança.

### Fase 3 — ETL e validação

- implementar preflight, carga, transformações e relatório;
- implementar validadores de contagem, integridade e hashes;
- testar reexecução e falhas no meio da carga.

**Saída:** cópia sanitizada migra de forma repetível e sem divergências.

### Fase 4 — compatibilidade da aplicação

- corrigir queries e tratamento de erros específicos do conector;
- adaptar dinheiro sem quebrar a API;
- adicionar testes de integração com MongoDB;
- executar testes backend/frontend e builds.

**Saída:** regressão funcional aprovada no ambiente de homologação.

### Fase 5 — ensaio e produção

- executar ensaio completo, restauração e rollback;
- fechar runbook com responsáveis e tempos medidos;
- executar corte, smoke test e observação assistida;
- retirar PostgreSQL somente após o período de estabilização.

**Saída:** MongoDB como fonte única, com backup restaurável e PostgreSQL
aposentado de forma controlada.

## 11. Critérios de go/no-go

O corte só pode começar quando todos os itens abaixo forem verdadeiros:

- replica set saudável e monitorado;
- migrations Mongo reaplicáveis e sem drift;
- dois ensaios completos com duração dentro da janela;
- contagens, hashes, relações e dinheiro validados sem divergência;
- suíte de integração Mongo, Jest, Vitest e builds aprovados;
- backup PostgreSQL e Mongo restaurados em ensaio;
- rollback executado pelo menos uma vez em homologação;
- responsáveis, comunicação e janela de estabilização definidos.

Interromper o corte se houver registro rejeitado, índice não criado, relação órfã,
diferença monetária, falha no smoke test ou tempo restante insuficiente para
validar e ainda fazer rollback.

## 12. Riscos principais e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Perda de integridade sem foreign keys | Órfãos e cascades incompletos | Services validam referências, migrations auditam órfãos, testes de cascade e uso exclusivo do Prisma/runner para escrita. |
| Índice único opcional comum | Segunda linha nula falha | Índices únicos parciais versionados e teste com múltiplos nulos. |
| Dinheiro em `Float` | Arredondamento incorreto | Inteiros em centavos e validação exata no ETL/API. |
| Mongo standalone | Transações falham | Replica set em todos os ambientes. |
| `db push` em produção | Drift e índices parciais perdidos | Runner versionado; `db push` apenas descartável. |
| Unit tests mascaram incompatibilidade | Erro só aparece no go-live | Testes de integração com Mongo real. |
| Backup sem consistência | Restore perde/escalona escritas | `--oplog`/PITR e ensaio periódico de restore. |
| Fazer upgrade do Prisma junto com a troca | Duas fontes de regressão | Atualizar 5.19 → 6.19 antes, ainda em PostgreSQL, publicar e estabilizar separadamente. |
| Reprojetar documentos junto | Escopo e validação explodem | Primeira migração 1:1; otimizar depois com métricas. |

## 13. Arquivos que a implementação deverá alterar

- `backend/prisma/schema.prisma` e novo diretório de migrations Mongo;
- clients/schemas temporários e ETL em `backend/scripts/`;
- `backend/src/prisma/prisma.service.ts` e `backend/src/app.controller.ts`;
- services afetados por dinheiro, nulos, transações ou erros de unicidade;
- `backend/docker-compose.yml`, `docker-compose.prod.yml` e
  `backend/docker-entrypoint.sh`;
- `backend/.env.example`, `.env.production.example` e documentação de deploy;
- `scripts/backup.sh` e runbook de restore;
- testes de integração e workflow de CI;
- `AI/CONTEXT.md`, `AI/TASKS.md` e `AI/SKILLS/DATABASE/` ao concluir a
  implementação.

O frontend só deve mudar se os adaptadores do backend não conseguirem preservar o
contrato monetário atual. A meta explícita é não exigir essa mudança.

## 14. Próximo passo recomendado

Antes de abrir a implementação completa, executar somente a **Fase 0** e a
**Fase 1**. Elas respondem com baixo custo às três perguntas que decidem a
viabilidade real: onde o MongoDB será operado, quanto tempo o corte leva e quais
queries do Prisma 6.19 precisam ser alteradas. Só depois transformar as fases 2 a
5 em tarefas de entrega.
