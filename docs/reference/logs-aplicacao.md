# Logs da aplicação

Histórico técnico das requisições HTTP que chegam ao backend, para
diagnóstico administrativo — não é um observability stack, é uma janela
curta (100 requisições) para investigar um erro recente sem depender do
console do servidor.

## Como funciona

**Captura global.** Um middleware (`LogsAplicacaoMiddleware`, registrado para
todas as rotas em `LogsAplicacaoModule`) gera um `requestId` por requisição,
devolve esse valor no header `X-Request-Id` da resposta e observa `finish`/
`close` para enviar o resumo ao service sem bloquear nem alterar a resposta
entregue ao usuário. Um exception filter global (`@Catch()`, estende
`BaseExceptionFilter`) só anota o erro sanitizado no mesmo contexto antes de
delegar ao tratamento padrão do NestJS — status e corpo da resposta de
qualquer endpoint continuam exatamente os que já existiam.

**O que não é capturado.** Requisições `OPTIONS` (CORS) e as consultas do
próprio módulo (`GET /logs-aplicacao` e `GET /logs-aplicacao/:id`) não geram
registro, para o polling da tela não consumir o próprio histórico.

**O que nunca é persistido.** `Authorization`, cookies, tokens, senhas, body
de qualquer requisição, query string, parâmetros concretos de rota (a rota
gravada é sempre o template, ex. `PATCH /users/:id`) e objetos completos de
erro do Prisma/integrações externas. Mensagens e stacks passam por um
sanitizador que remove padrões reconhecidos de bearer token, cookie, senha e
segredo antes de truncar por tamanho.

**Rotação em ciclos de 100.** `LogAplicacaoControle` é uma linha singleton
com o ciclo atual e a quantidade já gravada nele. Cada gravação roda
numa transação com um advisory lock fixo do Postgres
(`pg_advisory_xact_lock`, chave constante em
`logs-aplicacao.service.ts`) — isso serializa a virada mesmo com requisições
concorrentes ou múltiplas réplicas da API. Ao atingir 100, a próxima
requisição elegível apaga o lote inteiro do ciclo anterior e grava a nova
entrada como sequência 1 do próximo ciclo. Não é uma janela deslizante: a
limpeza é sempre por lote completo.

**Falha do próprio logger.** Se a gravação falhar (banco fora, por exemplo),
a requisição original não muda de status; o middleware só registra a falha
pelo `Logger` nativo do NestJS, incluindo o `requestId`, sem tentar gravar
essa falha no banco.

## API

Tudo em `/logs-aplicacao`, exclusivo do usuário `MASTER` (`JwtAuthGuard` +
`RolesGuard` + `@Roles('MASTER')`, sem rotina própria — nem `ADMIN` comum
acessa, é dado operacional sensível de plataforma).

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/logs-aplicacao?resultado=&metodo=&statusHttp=&usuarioId=&busca=` | Resumo do ciclo atual (`{ ciclo, quantidade, limite, logs }`), mais recente primeiro |
| `GET` | `/logs-aplicacao/:id` | Detalhe completo, inclusive stack sanitizado |

`busca` filtra por rota ou `requestId` (contains, case-insensitive). Não há
`POST`/`PATCH`/`DELETE`: a escrita é interna ao middleware e a retenção é
automática. Um `id` de um ciclo já apagado responde 404.

## Frontend

`/logs` (rota `ProtectedRoute requireRole="MASTER"`, item **Logs** no menu, visível só para master).
A tela mostra o contador `Ciclo N — Q de 100 requisições`, atualiza a cada 10
segundos (`refetchInterval`) e também por um botão **Atualizar**; filtros de
resultado, método, status HTTP, usuário e busca entram na `queryKey`. Clicar
numa linha ou no botão **Detalhes** abre um diálogo com request ID, tempos,
origem, agente e blocos monoespaçados para mensagem/detalhes/stack, com
quebra de linha e rolagem horizontal controlada.

## Ativação

Aplique a migration `20260917200000_add_logs_aplicacao` — ela cria o enum
`LogAplicacaoResultado` e os modelos `LogAplicacao`/`LogAplicacaoControle`,
sem seed (o histórico começa vazio). Escrita à mão porque não havia Postgres
acessível no ambiente em que o módulo foi implementado; rode `prisma migrate
deploy` antes do próximo deploy e confirme com `prisma migrate status`.

## Quando algo não aparece

| Sintoma | Causa provável |
| --- | --- |
| Consultar `/logs` não muda a contagem | Esperado: `GET /logs-aplicacao` e `/logs-aplicacao/:id` ficam fora da captura |
| Erro 401/403 não aparece na lista | Confira o filtro de status/resultado — guards rodam depois do template de rota já resolvido, então esses casos são capturados normalmente |
| Rota aparece como "rota não reconhecida" | Nenhum controller casou com a URL (404 real) — não é bug, é o comportamento esperado para rota inexistente |
| Log de uma requisição some da tela | Ela foi apagada na virada do ciclo (100 → 1); o card do topo mostra o ciclo atual |
