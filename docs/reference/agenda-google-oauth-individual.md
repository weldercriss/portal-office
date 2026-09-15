# Implementar Agenda Google com autorização individual

Data: 09/09/2026. **Status: implementado** — a autorização individual descrita
aqui já está no código (`agenda-google-oauth.*`); o texto abaixo é o plano
original, mantido como registro de projeto.

## Objetivo

Sincronizar os plantões publicados com a agenda de cada colaborador usando autorização individual OAuth 2.0, seguindo o modelo do módulo de agendamento do projeto irmão `../portal`.

Cada pessoa conecta sua própria conta Google em **Meu perfil → Agenda Google**. Depois disso, o backend pode atualizar seus eventos mesmo quando ela não está com o portal aberto. A autorização pode ser revogada e, nesse caso, será necessário reconectar.

Esse fluxo dispensa a delegação para todo o domínio. Se o Workspace bloquear o aplicativo ou as permissões solicitadas, um administrador ainda precisará liberá-los. Ter permissão para entrar com Google não garante permissão para acessar a agenda. Consulte os [controles de acesso a aplicativos do Workspace](https://support.google.com/a/answer/7281227?hl=pt-BR).

## 1. Situação atual e referência do outro projeto

O [guia atual da agenda](agenda-google.md) documenta uma conta de serviço com delegação de domínio. Ele continua descrevendo o comportamento existente até a migração proposta neste documento.

| Parte | Implementação existente aqui | Implementação proposta |
| --- | --- | --- |
| Login Google | Valida um ID token para identificar o usuário | Aproveitar o login existente |
| Acesso à agenda | `JWT` da conta de serviço com `subject: usuarioEmail` | `OAuth2Client` com token individual |
| Autorização | Delegação concedida pelo superadministrador | Consentimento de cada colaborador |
| Credenciais | Chave JSON da conta de serviço | Client ID, Client Secret e refresh token por usuário |
| Perfil | Chave para ativar/desativar sincronização | Conectar, reconectar, desconectar e controlar a sincronização |
| Processamento | Fila `AgendaSyncPendente` e worker a cada minuto | Aproveitar a fila, adaptando falhas por conexão |

Referências no projeto `portal`, relativas à raiz deste repositório:

- [google.user-oauth.ts](../../portal/backend-ts/src/integrations/google/google.user-oauth.ts): autorização com código, acesso offline, renovação e operações na agenda individual.
- [schedulingCalendarConnections.service.ts](../../portal/backend-ts/src/modules/ops/scheduling/schedulingCalendarConnections.service.ts): valida o e-mail conectado e salva o refresh token criptografado.
- [schedulingCalendarConnections.routes.ts](../../portal/backend-ts/src/modules/ops/scheduling/schedulingCalendarConnections.routes.ts): início, callback, status e desconexão.

Lá, o callback é `/api/scheduling/calendar-connections/google/callback`. Aqui serão usadas as rotas propostas na seção 4. Não copiar a configuração central dos webinars: ela atende a outra finalidade.

## 2. Configuração no Google Cloud

### Reutilizar o aplicativo web do login

É possível reutilizar a credencial OAuth do tipo **Aplicativo da Web** já usada pelo login. Será necessário ter acesso ao projeto Google Cloud para configurar a API e a credencial; isso é diferente de ser superadministrador do Workspace.

1. No projeto que contém essa credencial, ativar a **Google Calendar API**.
2. Localizar o cliente OAuth existente em **Google Auth Platform → Clientes**, ou na área de credenciais de APIs e serviços.
3. Manter as origens JavaScript usadas pelo login e adicionar as URIs de redirecionamento da agenda.
4. Configurar o consentimento e as permissões solicitadas pelo aplicativo.
5. Disponibilizar o Client Secret correspondente apenas ao backend. Se ele não estiver disponível, seguir o processo de criação/rotação de segredo no Cloud e coordenar os consumidores afetados.

Para o desenho proposto, cadastrar exatamente estas URIs, substituindo o domínio de exemplo:

| Ambiente | URI de redirecionamento |
| --- | --- |
| Desenvolvimento, backend direto | `http://localhost:3333/agenda-google/oauth/callback` |
| Produção com o Caddy deste repositório | `https://SEU-DOMINIO/api/agenda-google/oauth/callback` |

O backend atual não tem prefixo global `/api`. Em produção, `frontend/Caddyfile` remove `/api` antes de encaminhar ao backend. A URI configurada no Google deve ser a URL pública completa, exatamente igual à enviada na autorização e na troca do código.

O fluxo exige consentimento para a agenda além da autenticação já feita pelo login. As etapas e os parâmetros são descritos na [documentação OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server).

### Permissões e público

Solicitar inicialmente:

```text
openid
email
https://www.googleapis.com/auth/calendar.events
```

`openid` e `email` permitem validar a identidade da conta conectada. `calendar.events` permite gerenciar eventos nas agendas acessíveis ao usuário; o backend deve limitar suas operações aos eventos de plantão que ele próprio registra. Não é uma permissão restrita apenas aos eventos do portal. Consulte os [escopos da Calendar API](https://developers.google.com/workspace/calendar/api/auth).

O outro projeto solicita também `calendar`, pois tem recursos como consulta de disponibilidade. Não copiar esse escopo amplo para esta primeira versão de plantões.

Configurar o público conforme a organização: aplicativo interno, quando disponível e todos os usuários pertencem à organização, ou externo conforme os participantes. Dois domínios de e-mail não comprovam que são a mesma organização Workspace. Em aplicativo externo no modo de teste, cadastrar os usuários de teste. Para acesso à agenda, refresh tokens de aplicativos externos em teste normalmente expiram em sete dias; preparar a publicação e eventual verificação antes do uso contínuo. Consulte as [regras de expiração de tokens](https://developers.google.com/identity/protocols/oauth2#expiration) e os [estados de publicação de aplicativos](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).

### Variáveis propostas

As variáveis novas abaixo deverão ser implementadas no código e documentadas nos arquivos de exemplo. Adicioná-las ao ambiente atual, por si só, não altera o modo de autenticação.

```dotenv
# Existentes: preservar os valores usados pelo login.
GOOGLE_AUTH_ENABLED="true"
GOOGLE_CLIENT_ID="CLIENT_ID_DO_APP_WEB.apps.googleusercontent.com"
GOOGLE_ALLOWED_DOMAINS="DOMINIOS_JA_AUTORIZADOS_NO_PORTAL"

# Existentes: manter desligado até concluir a implementação e configurar o ambiente.
GOOGLE_CALENDAR_ENABLED="false"
GOOGLE_CALENDAR_TIMEZONE="America/Sao_Paulo"
GOOGLE_CALENDAR_ID="primary"
APP_PUBLIC_URL="http://localhost:5173"

# Novas: exclusivas do backend.
GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET="SEGREDO_DO_MESMO_CLIENT_ID"
GOOGLE_CALENDAR_OAUTH_REDIRECT_URI="http://localhost:3333/agenda-google/oauth/callback"
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY="CHAVE_ALEATORIA_DE_32_BYTES_EM_BASE64"
```

Em produção, substituir `APP_PUBLIC_URL` pela origem pública do frontend e a URI OAuth pela URL HTTPS com `/api`. Gerar a chave de criptografia uma vez, por ambiente, e preservá-la entre reinícios e deploys. Ela deve ser independente dos segredos JWT do login.

Usar `GOOGLE_CLIENT_ID` também no serviço OAuth da agenda. Não reutilizar refresh tokens do outro projeto: eles pertencem ao cliente OAuth e ao consentimento com que foram emitidos. Não disponibilizar Client Secret, refresh tokens ou chave de criptografia em variáveis `VITE_*`.

No modelo final, a agenda deixa de depender de `GOOGLE_SERVICE_ACCOUNT_JSON` e `GOOGLE_SERVICE_ACCOUNT_FILE`. A retirada dessas configurações deve acontecer após a migração.

## 3. Banco de dados

Adicionar uma migration Prisma com uma conexão individual por usuário. Estrutura sugerida, a ajustar no [schema existente](../backend/prisma/schema.prisma):

| Campo de `AgendaGoogleConexao` | Finalidade |
| --- | --- |
| `id` | Identificador da conexão |
| `userId`, único, relacionado a `User` | Dono da autorização |
| `googleSub` | Identificador Google estável da conta autorizada |
| `googleEmail` | E-mail verificado na conexão |
| `refreshTokenCriptografado`, opcional | Token protegido; removido ao desconectar |
| `escopos` | Permissões efetivamente concedidas |
| `status` | `CONECTADA`, `RECONECTAR` ou `DESCONECTADA` |
| `ultimoErro`, opcional | Código/mensagem sanitizada para diagnóstico |
| `criadoEm`, `atualizadoEm` | Auditoria básica |

Criptografar com AES-256-GCM usando `node:crypto`, IV aleatório por gravação e autenticação do conteúdo. Guardar versão, IV, tag e ciphertext em um formato definido. Não usar hash para o refresh token: o backend precisa recuperá-lo para renovar o acesso. Não retornar esse campo pela API.

Adicionar também armazenamento temporário para o fluxo OAuth, por exemplo `AgendaGoogleOAuthTentativa`, com hash do `state`, `userId`, hash de um identificador do navegador, expiração e controle de consumo único. Usar prazo curto, como dez minutos, e remover tentativas expiradas. Isso evita depender da memória do processo para validar o callback.

Manter `User.agendaGoogleAtiva` como preferência. O valor `true` já existente não equivale a consentimento: só sincronizar com conexão válida e preferência ativa.

Preservar `PlantaoEventoAgenda` e `AgendaSyncPendente`. O vínculo do evento deve continuar existindo mesmo depois da exclusão do plantão, para permitir sua remoção remota. Guardar/associar a identidade Google de origem do vínculo, para que uma troca posterior de identidade não direcione uma exclusão para outra conta.

## 4. Backend: fluxo e rotas

Criar `AgendaGoogleOAuthService` e um controller específico para o callback. Reutilizar `google-auth-library`, que já está instalada.

Rotas propostas, sem o prefixo externo `/api`:

| Método e rota | Proteção | Resultado |
| --- | --- | --- |
| `POST /agenda-google/oauth/iniciar` | JWT do portal | `{ url }` para consentimento |
| `GET /agenda-google/oauth/callback` | `state` de uso único + vínculo com navegador | Salva conexão e redireciona para `/perfil` |
| `GET /agenda-google/status` | JWT do portal | Configuração, preferência e estado da conexão |
| `PATCH /agenda-google/preferencia` | JWT do portal | Liga/desliga a sincronização |
| `DELETE /agenda-google/conexao` | JWT do portal | Interrompe o uso da conexão e apaga credenciais locais |

O controller atual tem `@UseGuards(JwtAuthGuard)` na classe. Não colocar o callback sob esse guard: a navegação de retorno do Google não envia o Bearer token mantido pelo frontend. As demais operações permanecem autenticadas.

### Iniciar e concluir a conexão

1. O frontend chama a rota de início com `httpClient`, que envia o JWT do portal.
2. O backend associa uma tentativa ao usuário autenticado e gera um `state` aleatório. Vincula a tentativa também a um cookie temporário HttpOnly, `SameSite=Lax`, Secure em produção, com caminho que alcance o callback.
3. Monta a URL Google com `response_type=code`, escopos definidos, URI configurada, `access_type=offline` e `prompt=consent`. Pode fornecer `login_hint`; ele não substitui a validação da identidade retornada.
4. O frontend navega para a URL recebida. O usuário concede ou recusa o acesso.
5. No callback, validar e consumir atomicamente a tentativa, conferindo expiração e cookie antes de alterar a conexão. Tratar também recusas e parâmetros ausentes.
6. Trocar o código usando `OAuth2Client`. Validar o ID token retornado: assinatura, emissor, audiência, expiração, e-mail verificado e `sub`. Conferir que o usuário do portal segue ativo e que o e-mail coincide; quando `User.googleSub` existir, exigir também a coincidência do `sub`.
7. Verificar os escopos concedidos antes de marcar a conexão como funcional. Consentimento parcial sem a permissão de eventos não habilita sincronização.
8. Criptografar e salvar o refresh token. Se a resposta omitir um token novo, preservar um anterior apenas se ainda utilizável e pertencente à mesma identidade e cliente OAuth. Sem token utilizável, solicitar nova conexão; nunca substituir token existente por valor vazio.
9. Invalidar o cache de acesso desse usuário e reprocessar seus plantões futuros e vínculos pendentes, respeitando a preferência.
10. Apagar o cookie temporário e redirecionar para `${APP_PUBLIC_URL}/perfil?agendaGoogle=conectada`, ou para um código de erro conhecido.

Não aceitar URL arbitrária de redirecionamento fornecida pelo navegador. Não inserir tokens, código OAuth ou mensagens brutas do provedor na URL final ou nos logs. O padrão de troca por código e acesso offline está descrito na [documentação OAuth web do Google](https://developers.google.com/identity/protocols/oauth2/web-server).

### Cliente Calendar e elegibilidade

Adaptar [google-calendar.client.ts](../backend/src/agenda-google/google-calendar.client.ts):

- Receber `userId` para localizar a conexão. O e-mail sozinho não é uma credencial.
- Construir `OAuth2Client` com o cliente web e o refresh token recuperado no backend.
- Renovar access tokens quando necessário e salvar eventual refresh token atualizado.
- Invalidar clientes em cache ao reconectar ou desconectar; impedir gravações tardias de token após uma desconexão.
- Manter operações de criar, atualizar e remover, incluindo tratamento de evento ausente.
- Calcular `habilitado` pela flag e pela configuração OAuth válida, sem exigir chave de conta de serviço.

Em [agenda-google.service.ts](../backend/src/agenda-google/agenda-google.service.ts), exigir usuário ativo, plantão `PUBLICADO`, preferência ativa e conexão válida. A checagem atual de domínio representa o alcance da delegação; substituí-la pela elegibilidade da conexão, preservando as restrições de acesso do login do portal.

## 5. Sincronização, trocas e desconexão

Preservar a montagem dos horários, eventos de dia inteiro, virada da meia-noite e gatilhos existentes de criação, edição, exclusão, séries e troca de plantonista.

### Falhas por usuário

Hoje `sincronizar()` remove os eventos antigos antes de criar o do novo responsável. Com tokens individuais, quem saiu pode ter revogado o acesso. Adaptar o processamento para que essa falha não impeça a criação para quem entrou.

Executar as operações independentes e manter a pendência de limpeza antiga, com seu vínculo, até resolução. Distinguir falhas transitórias, que continuam com repetição crescente, de autorização perdida, que exige reconexão. Não apagar uma pendência como se toda a sincronização tivesse terminado enquanto existir limpeza não resolvida. Ao reconectar, reativar essas pendências mesmo que o limite de tentativas anterior tenha sido atingido.

Se criar no Google funcionar e salvar o vínculo falhar, uma repetição não pode gerar outro evento. Definir uma estratégia de idempotência, como ID determinístico compatível com as regras de IDs da Calendar API, e cobrir esse cenário antes da ativação.

| Situação | Tratamento proposto |
| --- | --- |
| Sem conexão inicial | Não chamar o Google; oferecer conexão no perfil |
| `invalid_grant` na renovação | Marcar `RECONECTAR`, invalidar cache e interromper tentativas inúteis dessa conexão |
| `403` | Classificar a causa: permissão, política ou cota; não tratar todo `403` como token revogado |
| `429`, erro de rede ou `5xx` | Repetir com espera crescente |
| Evento removido, confirmado pelo retorno da operação | Recriar se o plantão continuar elegível |
| Reconexão válida | Reprocessar futuros e vínculos pendentes |

O worker existente pressupõe uma única instância do backend. Manter essa restrição ou implementar aquisição exclusiva das pendências antes de usar várias réplicas.

### Desligar sincronização e desconectar

Preservar o significado da preferência atual: desligar a sincronização enfileira a remoção dos eventos já criados, mantendo a autorização disponível para realizar a limpeza. Ligar novamente reprocessa os plantões futuros.

Para **Desconectar**, adotar um comportamento explícito nesta primeira versão: interromper novas chamadas, remover o refresh token local e invalidar o cache; os eventos já existentes permanecem. Informar isso na interface. Quem quiser removê-los pelo portal deve desligar a sincronização e aguardar a limpeza antes de desconectar. Se o acesso já tiver sido revogado no Google, a remoção remota dependerá de reconexão ou de exclusão manual.

Manter os vínculos necessários para reconhecer eventos existentes e não duplicá-los após reconexão. Não apagar vínculos afirmando que eventos remotos foram excluídos sem confirmação.

Desconexão local e revogação no Google são operações diferentes. Como o cliente OAuth será compartilhado com o login, não adicionar revogação automática da concessão Google sem avaliar seu alcance sobre outras permissões do mesmo aplicativo. A [documentação de revogação OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke) descreve esse comportamento.

## 6. Frontend: Meu perfil

Alterar [AgendaGoogleCard.tsx](../frontend/src/modules/usuarios/components/AgendaGoogleCard.tsx) e [agenda-google.api.ts](../frontend/src/modules/usuarios/api/agenda-google.api.ts). A página existente é `/perfil`.

Contrato sugerido para o status:

```ts
interface StatusAgendaGoogle {
  habilitado: boolean;
  ativa: boolean;
  conexao: 'NAO_CONECTADA' | 'CONECTADA' | 'RECONECTAR';
  googleEmail: string | null;
  limpezaPendente: boolean;
}
```

`habilitado` representa configuração global; `ativa` representa preferência; `conexao` representa autorização individual. Remover `dominioSuportado` do contrato e do card na mesma alteração, substituindo a mensagem específica de delegação.

| Estado | Interface |
| --- | --- |
| Integração desligada | Manter o comportamento de ocultar o card |
| Não conectada | Botão **Conectar Agenda Google** e explicação sobre os plantões |
| Conectada | E-mail autorizado, chave de sincronização e botão **Desconectar** |
| Autorização perdida | Botão **Reconectar Agenda Google** |
| Limpeza em andamento | Informar que os eventos estão sendo removidos |
| Retorno com recusa ou erro | Mensagem curta, com possibilidade de tentar novamente |

Ao voltar do Google, recarregar o status do backend e limpar o parâmetro da URL. Não considerar o parâmetro `agendaGoogle=conectada` como prova de conexão. O mecanismo atual de sessão deve restaurar a autenticação do portal após a navegação.

## 7. Arquivos e ordem de implementação

| Ordem | Arquivos/área | Trabalho |
| --- | --- | --- |
| 1 | `backend/prisma/schema.prisma` e nova migration | Conexões e tentativas OAuth |
| 2 | Novos serviços em `backend/src/agenda-google/` | Criptografia, state, consentimento, callback e tokens |
| 3 | `agenda-google.controller.ts` e novo controller de callback | Rotas e proteção adequada |
| 4 | `google-calendar.client.ts` | Acesso por usuário com `OAuth2Client` |
| 5 | `agenda-google.service.ts` e `agenda-google.worker.ts` | Elegibilidade, reconexão, limpeza e falhas independentes |
| 6 | `agenda-google.module.ts` | Registrar novos providers/controllers |
| 7 | API e card da agenda no frontend | Conectar, reconectar, status e desconectar |
| 8 | Exemplos de ambiente e configuração de deploy | Incluir novas variáveis sem valores reais |
| 9 | Testes e `docs/agenda-google.md` | Validar e atualizar o guia operacional após a implementação |

Não alterar o login para exigir a agenda. O usuário deve continuar podendo entrar e usar o portal sem conceder essa permissão.

## 8. Validação antes de ativar

Implementar testes relevantes para os novos limites de autorização e sincronização:

- Callback sem state, expirado, reutilizado ou vindo de outro navegador é rejeitado.
- Conta Google diferente da conta do portal, usuário desativado e consentimento parcial não geram conexão válida.
- Tokens são criptografados e nunca aparecem na resposta de status.
- Renovação sem refresh token novo preserva corretamente o anterior; token inválido exige reconexão.
- Plantão publicado cria evento; alteração atualiza; exclusão remove; rascunho não cria.
- Turno atravessando meia-noite e evento de dia inteiro mantêm os horários existentes.
- Troca de plantonista cria para o novo responsável mesmo quando a remoção antiga depende de reconexão.
- Repetição após falha no banco não duplica o evento remoto.
- Desconectar impede uso posterior de cliente em cache; reconectar retoma pendências.
- Login Google e login por senha continuam funcionando sem agenda conectada.

Comandos a executar após a implementação, na raiz do repositório:

```powershell
npm --prefix backend test -- --runInBand
npm --prefix frontend test
npm --prefix backend run build
npm --prefix frontend run build
```

Gerar o cliente Prisma depois da alteração de schema e aplicar a migration no banco de desenvolvimento antes da validação integrada. Testes automatizados devem simular a API Google; validar o consentimento real e a escrita de eventos em homologação com uma conta de teste.

## 9. Ativação e retorno

1. Concluir o código e validar com a integração desligada no ambiente de produção.
2. Configurar API, cliente web, consentimento, redirect URI e segredos.
3. Aplicar a migration e publicar backend/frontend compatíveis.
4. Habilitar em homologação, conectar uma conta e validar publicação, atualização, troca, limpeza e reconexão.
5. Se houver eventos antigos criados pela conta de serviço, preservar seus vínculos e verificar se a conta OAuth conectada consegue atualizá-los no mesmo calendário. Não recriar todos os eventos indiscriminadamente.
6. Habilitar em produção e orientar cada colaborador a conectar a agenda em Meu perfil. Não haverá consentimento automático para quem já fazia login Google.
7. Observar erros sanitizados, conexões que exigem reconexão e pendências da fila.

Para interromper a integração, definir `GOOGLE_CALENDAR_ENABLED=false`. Isso pausa o processamento, mas não exclui eventos remotos nem revoga autorizações. Preservar tokens criptografados, a chave de criptografia e vínculos para uma retomada. Voltar ao código de delegação só funcionará se a delegação de domínio estiver efetivamente autorizada; ela não é um fallback disponível apenas por existir uma chave JSON.
