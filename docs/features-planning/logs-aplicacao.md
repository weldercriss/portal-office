# Plano: módulo de logs de requisições da aplicação

Status: **planejamento, nada implementado**. Levantamento feito em 17/09/2026
com base no backend NestJS/Express, no schema Prisma/PostgreSQL, nos guards de
autenticação e no padrão de módulos React/TanStack Query já usados pelo portal.

## 1. Objetivo

Criar um módulo administrativo que registre e exiba as requisições HTTP recebidas
pelo backend, permitindo identificar rapidamente:

- qual ação chegou à API;
- quando começou e quanto tempo levou;
- qual usuário autenticado originou a ação, quando houver;
- método, rota e status HTTP;
- se a execução terminou com sucesso, erro de cliente ou erro interno;
- mensagem, classe e stack trace sanitizado quando houver falha;
- um `requestId` único para correlacionar a tela com o log técnico do processo.

O histórico será deliberadamente pequeno e cíclico: guarda no máximo as 100
requisições do ciclo atual. Quando uma nova requisição chega após o ciclo atingir
100 entradas, as 100 anteriores são apagadas e a nova passa a ser a entrada 1 do
próximo ciclo.

## 2. Decisões de escopo

### Incluído na primeira versão

- todas as requisições HTTP que efetivamente chegam ao backend, inclusive login,
  refresh, formulários públicos, falhas de autenticação/autorização, validação e
  rotas inexistentes;
- requisições de leitura e de escrita, pois ambas podem falhar ou causar lentidão;
- identificação do usuário a partir de `req.user` quando o JWT já tiver sido
  validado;
- tela e endpoints exclusivos de `ADMIN`;
- filtro por resultado, método, status HTTP, usuário e busca por rota/request ID;
- atualização manual e atualização automática moderada da tela;
- detalhe da falha em um diálogo, sem alterar o formato da resposta original da
  API.

### Fora do escopo inicial

- logs do frontend executados apenas no navegador;
- arquivos estáticos servidos pelo Caddy, que não passam pelo NestJS;
- eventos Socket.IO, cron jobs e chamadas internas entre services;
- centralização externa em CloudWatch, Loki, Elasticsearch ou outro observability
  stack;
- armazenamento de body, resposta, cookies, tokens ou headers completos;
- exclusão manual, exportação e retenção configurável;
- métricas históricas, alertas e dashboards agregados.

Esses itens podem ser evoluções posteriores. Nesta versão, "cada ação" significa
cada chamada HTTP à API. Uma interação visual que não gera chamada ao backend não
produz log.

## 3. Regra exata dos 100 registros

Adotar a seguinte semântica para não deixar a tela vazia ao completar um lote:

1. o ciclo começa vazio;
2. as requisições 1 a 100 são persistidas e ficam visíveis;
3. quando a requisição 101 terminar, o backend apaga as 100 entradas do ciclo
   anterior dentro da mesma transação;
4. essa requisição é gravada como sequência 1 de um novo ciclo;
5. o processo se repete nas requisições 201, 301 e assim por diante.

Não implementar uma janela deslizante que apaga apenas o registro mais antigo. O
pedido é de limpeza integral por lote, então a tela deve informar o ciclo atual e
mostrar `N de 100 requisições` para deixar o comportamento compreensível.

Não entram nessa contagem:

- `OPTIONS`, usados pelo CORS e não por uma ação funcional;
- `GET /logs-aplicacao` e `GET /logs-aplicacao/:id`, pois o polling da própria tela
  não pode apagar o histórico observado.

## 4. Arquitetura de captura

Criar `backend/src/logs-aplicacao/` e registrar `LogsAplicacaoModule` no
`AppModule`.

### 4.1 Contexto e identificador da requisição

Um middleware global deve:

- gerar um UUID no servidor, sem confiar em um ID enviado pelo cliente;
- colocar o valor em `req` e no header de resposta `X-Request-Id`;
- registrar o horário monotônico de início;
- observar `finish` e `close` da resposta com proteção para executar uma única
  vez;
- enviar ao service o resumo final sem bloquear ou mudar a resposta entregue ao
  usuário.

Tipar a extensão do `Request` com uma interface própria; não introduzir `any`.

### 4.2 Detalhes de exceção

Um exception filter global deve enriquecer o contexto criado pelo middleware com
os dados sanitizados da exceção e depois delegar ao tratamento padrão do NestJS.
Assim, permanecem inalterados os status e corpos que controllers, guards,
`ValidationPipe` e o framework já retornam hoje.

Essa combinação é preferível a depender somente de um interceptor: guards e
falhas de rota podem acontecer antes de o interceptor do controller ser executado.
O listener da resposta continua sendo o único ponto que persiste o registro,
evitando duplicidade entre middleware e filter.

### 4.3 Falhas no próprio logger

Gravar o log é observabilidade, não regra de negócio. Se a persistência falhar:

- a requisição original não pode mudar de status nem falhar por causa disso;
- emitir a falha pelo `Logger` nativo do NestJS, incluindo o `requestId`;
- não tentar registrar essa falha novamente no banco, evitando recursão.

## 5. Dados persistidos

Adicionar uma migration Prisma com enum e dois modelos.

### 5.1 Resultado

```prisma
enum LogAplicacaoResultado {
  SUCESSO
  ERRO_CLIENTE
  ERRO_SERVIDOR
  ABORTADA
}
```

Classificação:

- `SUCESSO`: status menor que 400;
- `ERRO_CLIENTE`: 400 a 499;
- `ERRO_SERVIDOR`: 500 ou maior;
- `ABORTADA`: conexão encerrada antes do `finish`, exibida como status 499 apenas
  no log interno.

### 5.2 Registro da requisição

Criar `LogAplicacao` com, no mínimo:

```text
id, requestId, ciclo, sequencia, resultado
metodo, rota, statusHttp, duracaoMs
iniciadoEm, finalizadoEm
usuarioId opcional, usuarioNome e usuarioEmail opcionais
ipOrigem opcional, userAgent opcional
erroClasse, erroMensagem, erroStack e erroDetalhes opcionais
```

Detalhes de modelagem:

- `requestId` único;
- unicidade composta em `(ciclo, sequencia)`;
- índices em `finalizadoEm`, `resultado`, `statusHttp` e `usuarioId`;
- relação opcional com `User` usando `onDelete: SetNull`;
- nome/e-mail como snapshot para o log continuar inteligível se o usuário mudar
  ou for removido;
- limites explícitos no service para `userAgent`, mensagem, stack e detalhes, para
  uma exceção anormal não inflar a tabela;
- datas salvas em UTC e formatadas em `pt-BR` somente no frontend.

### 5.3 Controle do ciclo

Criar `LogAplicacaoControle` com uma linha singleton contendo `ciclo`,
`quantidade` e `atualizadoEm`. Não calcular a virada apenas com `count()`: duas
requisições concorrentes poderiam ultrapassar 100 ou apagar o ciclo errado.

Em cada gravação, o service abre uma transação e adquire um advisory lock fixo do
PostgreSQL por meio do Prisma. Dentro dessa seção serializada:

1. cria ou lê o controle singleton;
2. se `quantidade >= 100`, executa `deleteMany` nos logs, incrementa `ciclo` e
   zera a quantidade;
3. cria o log com `sequencia = quantidade + 1`;
4. atualiza o controle;
5. confirma a transação.

O lock cobre múltiplas requisições concorrentes e também múltiplas réplicas da
API. A chave do advisory lock deve ser constante e documentada, nunca construída
com entrada externa.

## 6. Segurança e sanitização

O módulo armazenará informação operacional sensível e será exclusivo de
`ADMIN`, usando `JwtAuthGuard`, `RolesGuard` e `@Roles('ADMIN')` no controller.
Não criar uma rotina delegável nesta primeira versão.

Nunca persistir:

- `Authorization`, cookies, access token, refresh token ou credenciais Google;
- body de login, senha ou qualquer payload completo;
- arquivos enviados ou conteúdo de respostas;
- query string e parâmetros brutos;
- objetos completos de erro do Prisma ou de integrações externas.

A rota registrada deve ser o template do Nest/Express, como
`PATCH /users/:id`, e não a URL concreta. Isso evita guardar UUIDs, tokens de
formulários públicos e outros identificadores sensíveis. Para 404, em que não há
template reconhecido, salvar apenas `rota não reconhecida`, sem copiar a URL.

Para erros:

- 4xx: guardar a classe e a mensagem pública já produzida pela exceção/validação;
- 5xx: guardar classe, mensagem e stack trace truncado;
- Prisma/integrações: aceitar somente campos explicitamente permitidos, como um
  código técnico; nunca serializar o erro inteiro;
- remover padrões reconhecidos de bearer token, cookie, senha e segredo antes da
  persistência, mesmo nos campos permitidos.

`ipOrigem` deve representar o peer observado pelo Express. Só interpretar
`X-Forwarded-For` depois de configurar proxies confiáveis no deploy; não confiar
automaticamente em um header que o cliente pode forjar.

## 7. API administrativa

### Listagem

```http
GET /logs-aplicacao
```

Filtros opcionais validados por DTO:

```text
resultado, metodo, statusHttp, usuarioId, busca
```

Resposta:

```json
{
  "ciclo": 3,
  "quantidade": 42,
  "limite": 100,
  "logs": []
}
```

Os itens vêm do mais recente para o mais antigo e trazem apenas o resumo. Como há
no máximo 100 registros, paginação não é necessária nesta versão.

### Detalhe

```http
GET /logs-aplicacao/:id
```

Retorna os campos completos, inclusive stack e detalhe sanitizado. Um ID ausente
ou pertencente ao ciclo já apagado retorna 404.

Não criar `POST`, `PATCH` ou `DELETE`: a escrita é interna e a retenção é
automática.

## 8. Frontend

Criar `frontend/src/modules/logs-aplicacao/` seguindo o padrão existente:

```text
api/logs-aplicacao.api.ts
hooks/useLogsAplicacao.ts
types/log-aplicacao.types.ts
pages/LogsAplicacaoPage.tsx
components/LogAplicacaoDetalheDialog.tsx
```

Registrar `/logs` com `lazy` em `AppRoutes.tsx`, protegido por
`<ProtectedRoute requireRole="ADMIN">`, e adicionar **Logs** ao menu principal
com `adminOnly: true`. Reutilizar um ícone existente compatível ou adicionar um
SVG no padrão de `frontend/public/assets/svg/`.

A tela deve ter:

- cabeçalho "Logs da aplicação" e contador `N de 100` com o número do ciclo;
- botão **Atualizar** e `refetchInterval` de 10 segundos enquanto a página estiver
  montada;
- filtros por resultado, método, status HTTP, usuário e busca;
- tabela com data/hora, resultado, método, rota, usuário, status e duração;
- badges distintos para sucesso, 4xx, 5xx e abortada;
- clique na linha ou ação **Detalhes** abrindo `Dialog`;
- detalhe com request ID, tempos, origem, agente e bloco monoespaçado para erro e
  stack, com quebra de linha e rolagem horizontal controlada;
- `LoadingState`, `EmptyState` e `ErrorState` já existentes.

Dados da API ficam no TanStack Query. Filtros de servidor entram na `queryKey`;
estado de abertura do diálogo e filtro ainda não aplicado permanecem locais. A
API usa exclusivamente `httpClient`.

Como os endpoints de consulta são excluídos da captura, o polling não altera a
contagem nem dispara a limpeza do ciclo.

## 9. Organização do backend

Estrutura prevista:

```text
backend/src/logs-aplicacao/
  dto/listar-logs-aplicacao.dto.ts
  logs-aplicacao.controller.ts
  logs-aplicacao.service.ts
  logs-aplicacao.middleware.ts
  logs-aplicacao-exception.filter.ts
  logs-aplicacao.sanitizer.ts
  logs-aplicacao.module.ts
  *.spec.ts
```

Responsabilidades:

- controller: somente endpoints e guards;
- service: queries, rotação e persistência via `PrismaService`;
- middleware: ciclo de vida HTTP e metadados básicos;
- filter: captura de exceção sem substituir a resposta padrão;
- sanitizer: funções puras de classificação, truncamento e remoção de segredos.

Não criar camada de repository e não instalar biblioteca de logging. O `Logger`
do NestJS continua atendendo console/produção; este módulo é um histórico curto
para consulta no portal.

## 10. Fases de implementação

### Fase 1 — persistência e retenção

1. adicionar enum, modelos e relação opcional com `User` ao `schema.prisma`;
2. gerar migration com `npx.cmd prisma migrate dev --name add-logs-aplicacao`
   dentro de `backend/`;
3. implementar sanitizer e service;
4. cobrir a virada do ciclo, limites e concorrência.

### Fase 2 — captura transversal

1. criar contexto tipado e middleware global;
2. criar exception filter global que preserve o comportamento atual;
3. registrar ambos pelo módulo/NestJS;
4. excluir `OPTIONS` e endpoints do próprio módulo;
5. validar sucesso, 400 de DTO, 401, 403, 404, 500 e conexão abortada.

### Fase 3 — consulta administrativa

1. criar DTO de filtros, controller e respostas de resumo/detalhe;
2. aplicar guards de `ADMIN` na classe;
3. garantir ordenação e retorno do estado do ciclo;
4. testar acesso negado para usuário comum.

### Fase 4 — interface

1. criar tipos, API e hooks;
2. construir tabela, filtros, contador e diálogo de detalhes;
3. registrar rota lazy e item de navegação;
4. testar estados, filtros, atualização e proteção de acesso.

### Fase 5 — validação e documentação

1. rodar testes e build de backend e frontend;
2. conferir `prisma migrate status` no ambiente alvo;
3. testar manualmente um ciclo completo com 101 requisições;
4. revisar a tela em desktop e viewport menor;
5. atualizar `AI/CONTEXT.md`, `AI/TASKS.md` e a sessão da implementação;
6. documentar operação e limitações em `docs/reference/`.

## 11. Testes obrigatórios

### Backend — Jest

- classifica corretamente sucesso, 4xx, 5xx e abortada;
- sanitiza token, cookie, senha e segredo de mensagens/stacks simulados;
- não guarda body, query string nem parâmetro concreto;
- associa usuário autenticado e aceita usuário ausente;
- mantém as entradas 1 a 100 no mesmo ciclo;
- na 101ª, apaga o lote anterior e cria a sequência 1 no novo ciclo;
- duas gravações concorrentes próximas do limite não geram 101 registros, ciclos
  inconsistentes ou sequência duplicada;
- `OPTIONS` e leitura do próprio módulo não são registrados;
- falha do banco durante o log não altera a resposta original;
- controller rejeita `USER` e permite `ADMIN`;
- 400, 401, 403, 404 e 500 preservam o contrato HTTP atual.

### Frontend — Vitest/Testing Library

- renderiza loading, erro, vazio e lista;
- mostra contador e ciclo;
- aplica os filtros e refaz a consulta com a chave correta;
- abre o detalhe e apresenta mensagem/stack quando houver;
- não mostra dados de erro quando ausentes;
- rota e item de menu ficam disponíveis somente para `ADMIN`;
- atualização manual chama `refetch`.

### Verificação final

```text
backend/:  npm.cmd test -- --runInBand
backend/:  npm.cmd run build
backend/:  npx.cmd prisma migrate status
frontend/: npm.cmd test
frontend/: npm.cmd run build
```

## 12. Critérios de aceite

- toda requisição HTTP elegível gera exatamente um registro;
- cada registro possui request ID, método, template da rota, status e duração;
- ações autenticadas identificam o usuário; chamadas públicas continuam
  registradas sem inventar um ator;
- falhas exibem informação técnica suficiente para diagnóstico sem expor
  credenciais ou payloads;
- resposta e status dos endpoints existentes não mudam por causa do logger;
- uma falha na gravação do log não derruba a ação do usuário;
- somente administradores consultam a API e a tela;
- os 100 registros permanecem visíveis até a próxima requisição elegível;
- a 101ª limpa integralmente o ciclo anterior e inicia o próximo em 1;
- concorrência não ultrapassa o limite nem apaga o ciclo errado;
- consultar/atualizar a tela de logs não consome registros;
- testes, builds e migration status passam antes da entrega.

## 13. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Vazamento de senha/token em erro | allowlist de campos, sanitização e proibição de body/headers completos |
| Logger alterar a resposta original | persistência desacoplada do resultado e fallback somente em console |
| Duplicidade em exceções | middleware como único escritor; filter apenas anota o contexto |
| Corrida no limite de 100 | transação com advisory lock no PostgreSQL |
| Tela apagar os próprios dados | excluir endpoints de leitura e `OPTIONS` da captura |
| Pouco histórico para erro intermitente | deixar explícito que 100 é requisito desta versão; observabilidade externa é evolução |
| Stack muito grande | truncamento e limites por campo |
| IP incorreto atrás do proxy | não confiar em `X-Forwarded-For` sem proxies confiáveis configurados |

## 14. Arquivos previstos

### Backend e banco

- `backend/prisma/schema.prisma`;
- nova migration em `backend/prisma/migrations/`;
- `backend/src/logs-aplicacao/`;
- `backend/src/app.module.ts`;
- eventualmente `backend/src/main.ts` apenas se o registro global não puder ficar
  inteiramente no módulo.

### Frontend

- `frontend/src/modules/logs-aplicacao/`;
- `frontend/src/router/AppRoutes.tsx`;
- `frontend/src/app/layouts/navigation.ts`;
- `frontend/public/assets/svg/` se for necessário um ícone novo;
- testes de rota/navegação afetados.

### Documentação ao implementar

- `AI/CONTEXT.md`;
- `AI/TASKS.md`;
- `AI/SESSIONS/<dd-mm-aaaa>.md`;
- `docs/reference/logs-aplicacao.md`;
- `docs/README.md`.

## 15. Próximo passo recomendado

Implementar primeiro a Fase 1 e provar por teste a rotação atômica de 100 para 1.
Esse é o comportamento menos comum do módulo e o ponto de maior risco sob
concorrência. Depois, conectar a captura global e só então construir a tela sobre
um contrato já estável.
