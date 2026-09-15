# Deploy do Portal Backoffice no EC2

Esta é a adaptação de [configurar-deploy-ec2.md](configurar-deploy-ec2.md) para as
pastas reais `backend/` e `frontend/`. Como o EC2 já existe, comece pela preparação
abaixo. O fluxo local de [como-rodar.md](como-rodar.md) continua igual: Postgres em
5433, backend em 3333 e Vite em 5173.

## Arquitetura e arquivos

```text
Internet :80/:443 -> Caddy de borda -> web:80
                                      | /api/* -> backend:3333 (remove /api)
                                      | /socket.io/* -> backend:3333 (WebSocket)
                                      | demais caminhos -> SPA
                                                        backend -> postgres:5432
```

- `backend/Dockerfile`: Node 22, Prisma, migrações no início e processo sem root.
- `frontend/Dockerfile` e `frontend/Caddyfile`: build Vite com `/api` e Socket.IO
  na origem do navegador. Nenhum domínio é gravado no bundle.
- `docker-compose.prod.yml`: imagens `portal-backoffice-backend` e
  `portal-backoffice-web`; exige `IMAGE_TAG`, sem builds nem portas publicadas.
- `docker-compose.caddy.yml` e `Caddyfile`: projeto separado para HTTP/HTTPS,
  certificados persistentes e rede externa `portal-backoffice-prod_default`.
- Volumes `portal-backoffice-prod_postgres_data` e
  `portal-backoffice-prod_uploads_data`: persistem banco e anexos. São separados
  do volume de desenvolvimento. Uma primeira subida cria um banco vazio.

Somente o Caddy de borda publica portas. `/health` consulta o banco; o healthcheck
do web verifica também `/api/health`. O cookie de renovação usa
`/api/auth/refresh` em produção e mantém `/auth/refresh` no desenvolvimento.
O proxy segue as diretivas oficiais de [handle_path](https://caddyserver.com/docs/caddyfile/directives/handle_path)
e [reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## Preparar a instância existente

Use WSL/Linux para os scripts Bash. Na instância, confira `docker --version`,
`docker compose version` e `uname -m`. É necessário Docker Engine com Compose v2
que suporte `up --wait --wait-timeout`. Se faltar, siga a
[instalação oficial para Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
O usuário SSH precisa conseguir executar Docker; após adicioná-lo ao grupo
`docker`, abra uma nova sessão. O guia original detalha swap para instâncias pequenas.

No security group, permita 80/TCP e 443/TCP; 443/UDP é opcional para HTTP/3.
Mantenha acesso SSH pela sua chave. Aponte o DNS do domínio para o IP do EC2.

Na instância:

```bash
mkdir -p ~/portal-backoffice
cd ~/portal-backoffice
umask 077
nano .env
chmod 600 .env
```

Preencha usando [.env.production.example](../.env.production.example). O `.env`
real fica só no EC2 e nenhum script o envia. Gere a senha do banco com
`openssl rand -hex 32`: o Compose monta `DATABASE_URL` automaticamente a partir
de `POSTGRES_*`, e uma senha hexadecimal evita caracteres reservados em URLs.
Use valores diferentes de `openssl rand -hex 48` para os dois segredos JWT.
Substitua todos os `TROQUE-ME`, inclusive o administrador.

Para domínio: `APP_DOMAIN=portal.seudominio.com.br`,
`CORS_ORIGIN=https://portal.seudominio.com.br` e `COOKIE_SECURE=true`.
Para o primeiro acesso por IP/HTTP: deixe `APP_DOMAIN=` vazio, use
`CORS_ORIGIN=http://SEU_IP` e `COOKIE_SECURE=false`. A borda funciona nos dois modos.
Ao habilitar HTTPS depois, atualize essas três variáveis e faça novo deploy.

Para criar o primeiro administrador, coloque `RUN_SEED=true`, `ADMIN_EMAIL`,
`ADMIN_NAME` e uma `ADMIN_PASSWORD` com pelo menos 16 caracteres. O seed de
produção não usa os usuários de teste e nunca altera um usuário existente.
Falha no seed interrompe a inicialização. Após confirmar o login, volte
`RUN_SEED=false` e remova `ADMIN_PASSWORD` do `.env`; faça novo deploy para
retirar a senha do ambiente do container. O seed local permanece igual.

Para o login com Google, publique primeiro com `GOOGLE_AUTH_ENABLED=false`.
Depois preencha `GOOGLE_CLIENT_ID` no `.env` do EC2 com o Client ID web do
console do Google, configure a variável `VITE_GOOGLE_CLIENT_ID` com o mesmo
valor em *Settings > Secrets and variables > Actions > Variables* (o Vite grava
a variável no bundle durante o build) e faça novo deploy. Só então mude
`GOOGLE_AUTH_ENABLED=true`, valide com uma conta autorizada e siga para
produção. Use `GOOGLE_ALLOWED_DOMAINS` (separados por vírgula) para restringir
o acesso aos Workspaces da empresa; o backend confere o campo `hd` do ID token,
não o sufixo do e-mail. Com `GOOGLE_AUTO_PROVISION=true`, quem entra pelo Google
com uma conta desses domínios ganha cadastro no primeiro acesso, sem
departamento e sem rotinas, e o admin concede os acessos depois; um usuário que
já existe é vinculado automaticamente, e conta desativada continua recusada. As origens do portal
precisam ser as mesmas cadastradas no console do Google. O rollback é voltar
`GOOGLE_AUTH_ENABLED=false`: o login por senha e os vínculos gravados
permanecem.

Para os plantões na Agenda Google, o roteiro completo — Calendar API, URIs de
redirecionamento no mesmo cliente OAuth do login e variáveis — está em
[agenda-google.md](agenda-google.md). Publique com `GOOGLE_CALENDAR_ENABLED=false`
e ligue depois de configurar o consentimento. A chave
`GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` precisa sobreviver aos deploys: sem ela,
todos precisam reconectar a agenda.

Se as imagens forem privadas, faça `docker login` também no EC2 com token de
leitura. A instância somente baixa imagens, nunca compila o projeto.

## Construir e entregar

No WSL/Linux, na raiz do repositório, depois de commitar as alterações:

```bash
export DOCKER_NAMESPACE=seu-usuario-dockerhub
export EC2_HOST=SEU_IP
export EC2_USER=ubuntu
export SSH_KEY_SOURCE=ssh/sua-chave.pem
# Alternativa: export SSH_KEY="$HOME/.ssh/sua-chave.pem"
# Opcional: export EC2_DIR=/home/ubuntu/portal-backoffice
docker login
bash scripts/deploy.sh
```

`SSH_KEY_SOURCE` copia a chave para o filesystem Linux com permissão 400, para
funcionar no WSL. `ssh/`, `.env*`, chaves e uploads são excluídos do contexto Docker.
O script exige árvore Git limpa, incluindo arquivos não rastreados, e publica
as duas imagens com `sha-<12 caracteres do commit>`. Ele envia apenas os arquivos
de composição, Caddy e backup, puxa as imagens, aplica migrações e aguarda saúde.
A borda fica em outro projeto Compose; não é derrubada para atualizar o backend.

Para publicar sem entregar: `bash scripts/build-push.sh`.
Para entregar imagens já publicadas: `bash scripts/deploy.sh sha-0123456789ab`.
Tags `latest` são recusadas. O padrão de build é `linux/amd64`; para Graviton,
exporte `PLATFORM=linux/arm64` e use um builder compatível (nativo ou com emulação).

Teste no navegador login, renovação da sessão, notificações e anexos. Confirme
também `https://SEU_DOMINIO/api/health`. Não há deploy sem breve indisponibilidade:
o Compose troca o único container de cada serviço.

## GitHub Actions

O workflow [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) publica
e entrega em pushes na `main` e execuções manuais na `main`. Configure:

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `DOCKER_NAMESPACE` | Namespace das imagens, igual ao `.env` do EC2 |
| Variable | `EC2_HOST` | IP ou DNS do EC2 |
| Variable opcional | `EC2_USER` | Padrão `ubuntu` |
| Variable opcional | `EC2_DIR` | Padrão `/home/<usuario>/portal-backoffice` |
| Variable opcional | `PLATFORM` | Padrão `linux/amd64` |
| Variable opcional | `BUILD_RUNNER` | Padrão `ubuntu-24.04`; use `ubuntu-24.04-arm` com `linux/arm64` |
| Secret | `DOCKERHUB_USERNAME` | Usuário que publica as imagens |
| Secret | `DOCKERHUB_TOKEN` | Token com permissão de publicação |
| Secret | `EC2_SSH_KEY` | Conteúdo completo da chave privada |
| Secret | `EC2_KNOWN_HOSTS` | Linha de known_hosts com a chave pública verificada do EC2 |

Obtenha a fingerprint do host por uma sessão EC2 confiável; compare com a chave
obtida por `ssh-keyscan -H SEU_IP` antes de cadastrar `EC2_KNOWN_HOSTS`.
O CI exige essa verificação. Segredos da aplicação e do banco não vão ao GitHub.
A fila não cancela entregas em andamento; reexecutar um workflow antigo não
entrega um commit que já deixou de ser a ponta da `main`.
Evite entregar manualmente enquanto o workflow estiver rodando: a fila do
GitHub coordena apenas as execuções do próprio workflow.

## Operação, rollback e backup

Na instância:

```bash
cd ~/portal-backoffice
export IMAGE_TAG="$(cat .deployed-tag)"
docker compose ps
docker compose logs --tail=100 backend
docker compose -f docker-compose.caddy.yml logs --tail=100
bash backup.sh
```

Após sucesso, `.deployed-tag` registra a versão e `.previous-tag` guarda a
anterior. Para voltar, execute na sua máquina `bash scripts/deploy.sh sha-COMMIT`
com a tag anterior real. Uma falha preserva o marcador anterior, mas os containers
podem ter sido trocados: não há rollback automático. Rollback das imagens não
desfaz migrações; mantenha compatibilidade do schema entre versões. O script
usa os arquivos de infraestrutura do checkout atual também no rollback.

`backup.sh` gera `backups/<data>/database.sql.gz`, `uploads.tar.gz` e `image-tag`.
Só considere conjuntos com arquivo `COMPLETE`. Execute em uma janela sem
alterações de anexos se precisar de consistência entre banco e arquivos.
Copie os conjuntos para fora do EC2, por exemplo com `scp -r` para uma pasta
fora do repositório. O script não remove backups antigos; acompanhe o espaço
livre e defina retenção ao configurar armazenamento externo.

Para agendar diariamente no crontab do usuário (ajuste o caminho):

```cron
17 3 * * * /bin/bash /home/ubuntu/portal-backoffice/backup.sh >> /home/ubuntu/portal-backoffice/backup.log 2>&1
```

Nunca use `docker compose down -v` para atualizar: isso apaga os volumes.
Não reutilize o volume local como produção. Se precisar levar os dados locais,
faça uma migração explícita com dump/restore e cópia dos uploads.

## Validação

```bash
bash scripts/tests/remote-deploy.sh
IMAGE_TAG=sha-0123456789ab docker compose --env-file .env.production.example -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production.example -f docker-compose.caddy.yml config --quiet
docker build -f backend/Dockerfile -t portal-backoffice-backend:test .
docker build -f frontend/Dockerfile -t portal-backoffice-web:test .
```

Os testes de deploy simulam Docker para verificar falhas e leitura via stdin;
não substituem a primeira validação real no Docker/EC2.
