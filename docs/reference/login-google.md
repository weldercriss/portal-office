# Plano de implementação do login com Google

> **Status: implementado.** Movido para `reference/` — o texto abaixo é o plano
> original, mantido como registro de projeto; o código já reflete isso.

## Objetivo e premissas

Adicionar **Entrar com Google** ao login existente, reaproveitando o JWT, o cookie de renovação e as permissões do portal.

- Manter o login por senha disponível.
- Permitir acesso apenas a usuários ativos.
- Criar e vincular a conta no primeiro acesso somente quando o domínio
  corporativo for confiável, confirmado pelo campo `hd` do ID token.
- Fora desses domínios, exigir cadastro prévio e vínculo com confirmação da
  senha atual.
- Nunca reativar nem recriar um usuário desativado.

## Status atual

A configuração no Google Cloud foi concluída pelo responsável pelo portal, conforme informado em 09/09/2026. O cliente OAuth web, o público, a tela de consentimento e as origens já foram configurados, e o Client ID já foi obtido.

- [x] Configuração do aplicativo no console do Google.
- [x] Variáveis integradas ao projeto, ao Compose e ao build do painel.
- [x] Migration para vínculo da conta Google.
- [x] Endpoints de autenticação e vínculo no backend.
- [x] Integração do botão e da área de vínculo no frontend.
- [x] Testes automatizados de backend e frontend.
- [ ] Client ID preenchido no ambiente de execução e no build de produção.
- [ ] Homologação HTTPS e ativação.

As etapas abaixo tratam da integração no portal. A criação de credenciais no console não é mais uma pendência.

## 1. Integrar a configuração ao projeto

Usar o Google Identity Services com botão e retorno por JavaScript. Nesse fluxo, o frontend recebe a credencial e a envia ao backend.

Conectar o Client ID já criado às configurações da aplicação:

- Backend: `GOOGLE_CLIENT_ID` e `GOOGLE_AUTH_ENABLED`.
- Frontend: `VITE_GOOGLE_CLIENT_ID`.
- Opcional: `GOOGLE_ALLOWED_DOMAIN`, caso o acesso seja restrito ao Google Workspace da empresa.

Usar o mesmo Client ID no frontend e no backend de cada ambiente. Incluir a variável do frontend no processo de build e as variáveis do backend no ambiente de execução. Configurar a integração inicialmente desabilitada até concluir a implementação e os testes.

Referências: [configuração do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) e [API JavaScript](https://developers.google.com/identity/gsi/web/reference/js-reference).

## 2. Adicionar o vínculo da conta no banco

Alterar `backend/prisma/schema.prisma`, acrescentando ao usuário:

- `googleSub`: identificador único e opcional da conta Google.
- `googleLinkedAt`: data do vínculo.

Criar uma migration que preserve os usuários existentes e suas senhas.

### Primeiro vínculo

1. A pessoa entra com a senha atual.
2. Seleciona **Vincular Google** em uma área de conta.
3. Confirma novamente a senha e seleciona a conta Google.
4. O backend valida a credencial Google, exige o mesmo e-mail do cadastro e grava o vínculo.
5. Nos próximos acessos, o backend identifica a pessoa pelo `sub`.

Não vincular contas por coincidência de e-mail, exceto quando o domínio do
`hd` estiver na lista de domínios corporativos: nesse caso o e-mail é controlado
pela empresa e o vínculo automático é aceitável. O Google recomenda usar `sub`
como identificador persistente. Referência: [validação de ID tokens](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

### Cadastro automático por domínio

Com `GOOGLE_AUTO_PROVISION=true` e `GOOGLE_ALLOWED_DOMAINS` preenchido, o
primeiro acesso pelo Google cria a conta ativa, sem departamento e sem rotinas,
e o admin concede os acessos depois. A senha nasce vazia; a pessoa define a
primeira em **Definir senha**, sem confirmar a senha atual, e a partir daí
também entra por e-mail e senha. Sem a lista de domínios o cadastro automático
não liga, para que nenhuma conta Google do mundo vire usuário do portal.

## 3. Implementar a autenticação no NestJS

Nos arquivos de `backend/src/auth/`:

- Adicionar `google-auth-library` e um serviço de validação Google.
- Criar `POST /auth/google`, recebendo a credencial e retornando `{ accessToken, user }`, com o cookie de renovação atual.
- Criar `POST /auth/google/link`, uma rota autenticada para vincular a conta, recebendo a credencial Google e a senha atual. Identificar o usuário pela sessão autenticada.
- Extrair a emissão de sessão atual para uma função compartilhada entre login por senha e Google.
- Validar assinatura, emissor, destinatário, expiração, e-mail verificado e domínio, quando configurado.
- Para restrição ao Google Workspace, validar o campo `hd` no backend; o sufixo do e-mail não substitui essa validação.
- Proteger login e vínculo contra requisições forjadas e reutilização de credenciais, com desafio temporário vinculado ao navegador.
- Recusar usuários inativos, contas sem vínculo e vínculos duplicados.

Contrato previsto dos endpoints (o proxy de produção acrescenta o prefixo `/api`):

| Endpoint | Acesso | Responsabilidade |
| --- | --- | --- |
| `POST /auth/google/challenge` | Antes do login ou do vínculo | Emitir um desafio temporário, de uso único, vinculado ao navegador e à finalidade da operação; vincular também ao usuário autenticado quando a finalidade for vínculo. |
| `POST /auth/google` | Sem sessão prévia | Validar credencial e desafio, localizar o usuário por `googleSub` e emitir a sessão do portal. |
| `POST /auth/google/link` | Sessão autenticada e confirmação de senha | Validar credencial e desafio de vínculo, conferir o e-mail e gravar o vínculo sem substituir uma associação existente. |

Definir DTOs para os contratos e armazenar os desafios com expiração e consumo atômico, para que não possam ser reutilizados mesmo com múltiplas instâncias do backend. O frontend deve solicitar o desafio antes de iniciar a autenticação Google e passá-lo como `nonce` ao Google Identity Services; o backend deve conferir o `nonce` do token validado e sua associação ao navegador e à operação.

Também ajustar a renovação e a validação do JWT para consultar o usuário atual. Na implementação analisada, esses caminhos usam os dados do token sem verificar novamente se a conta foi desativada.

Arquivos principais:

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.module.ts`
- `backend/src/auth/jwt.strategy.ts`
- Novos DTOs e serviço de validação Google em `backend/src/auth/`.

## 4. Integrar a interface React

Em `frontend/src/pages/LoginPage.tsx`, incluir o botão oficial do Google e tratamento de carregamento, cancelamento e falha.

Em `frontend/src/shared/auth/AuthContext.tsx`, adicionar `loginWithGoogle()` e compartilhar a atualização da sessão com o login por senha.

Criar a área autenticada de vínculo, com confirmação de senha e indicação de conta vinculada. Se alguém tentar entrar antes de vincular, orientar a acessar com senha primeiro.

Se a integração estiver desabilitada ou o Google não carregar, o formulário atual deve continuar disponível.

Arquivos principais:

- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/shared/auth/AuthContext.tsx`
- `frontend/src/config/env.ts`
- `frontend/src/vite-env.d.ts`
- Novo componente do botão Google e área autenticada de vínculo.

## 5. Validar os fluxos

Ampliar os testes existentes de backend e frontend para cobrir:

- Login Google válido, com as mesmas permissões do login por senha.
- Credencial inválida, expirada ou emitida para outro aplicativo.
- Conta não vinculada, usuário inativo e domínio não autorizado.
- Vínculo com senha incorreta, e-mail diferente ou conta Google já vinculada.
- Proteção do desafio, incluindo expiração e reutilização.
- Cookie de renovação, logout e regressão do login atual.
- Bloqueio de usuário desativado durante a renovação e a validação da sessão.
- Falha de carregamento do Google sem impedir o login por senha.

Executar testes e builds dos dois projetos, além de validar o fluxo real em localhost e homologação HTTPS.

Testes existentes a ampliar:

- `backend/src/auth/auth.service.spec.ts`
- `backend/src/auth/auth.controller.spec.ts`
- `frontend/src/pages/LoginPage.test.tsx`

## 6. Preparar a entrega e ativação

Atualizar exemplos de ambiente, documentação, Docker e configuração de build do frontend para incluir o Client ID.

Arquivos a revisar:

- `backend/.env.example`
- `frontend/.env.example`
- `.env.production.example`
- `docker-compose.prod.yml`
- `frontend/Dockerfile`
- Pipeline de build e publicação em `.github/`.

Sequência de entrega:

1. Aplicar a migration.
2. Publicar com a integração desabilitada.
3. Injetar o Client ID já criado nas configurações do backend e no build do frontend.
4. Habilitar em homologação.
5. Validar com contas autorizadas.
6. Ativar em produção.

O rollback será desabilitar a integração, preservando o acesso por senha e os vínculos gravados.

## Custos

O login com Google não tem custo, e a Calendar API é gratuita dentro das cotas.
Os detalhes, as cotas e os pontos que podem gerar despesa ou atraso estão em
[custos-google.md](custos-google.md).

## Configuração restante para ativação

- Preencher as variáveis da aplicação e do deploy com o Client ID já obtido.
- Alinhar o endereço público e o CORS do portal às origens já cadastradas no Google.
- Se houver restrição corporativa, configurar o domínio permitido no backend e validar o campo `hd`.

A configuração concluída no console será utilizada nos testes reais de integração. O desenvolvimento pode começar com a integração desabilitada, sem repetir a criação de credenciais.

## Critérios de conclusão

- Usuário cadastrado e ativo consegue vincular sua conta após confirmar a senha.
- Usuário vinculado consegue entrar com Google e recebe as permissões atuais do portal.
- Conta não vinculada não obtém acesso nem gera cadastro automático.
- Credenciais inválidas, vínculos conflitantes e usuários inativos são recusados.
- Login por senha, renovação e logout continuam funcionando.
- Testes e builds passam, e o fluxo real é validado em homologação HTTPS.
- Configuração, ativação e rollback estão documentados.
