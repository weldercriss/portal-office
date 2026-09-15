# Como rodar o projeto

Para produção no EC2, use [deploy.md](deploy.md). O fluxo local abaixo continua independente dos arquivos de produção.

Guia para executar o projeto localmente. Os comandos abaixo usam PowerShell e partem da pasta raiz do repositório.

Use `npm.cmd` e `npx.cmd` no PowerShell: isso evita o erro de execução de scripts desabilitada ao chamar `npm.ps1`.

## Pré-requisitos

- Node.js 20.9 ou superior, com npm instalado.
- PostgreSQL disponível na porta `5433`. Para criar o banco com o Compose do projeto, tenha Docker com Docker Compose instalado e em execução (por exemplo, Docker Desktop).
- Portas `5433` (banco), `3333` (API) e `5173` (frontend) disponíveis.

## 1. Configurar o backend

No primeiro terminal:

```powershell
cd backend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edite `backend/.env` para usar a porta do PostgreSQL publicada pelo Docker:

```dotenv
DATABASE_URL="postgresql://portal_backoffice:portal_backoffice@localhost:5433/portal_backoffice?schema=public"
```

O arquivo de exemplo e o `docker-compose.yml` usam a porta `5433` no computador. Se seu PostgreSQL usa outra porta, ajuste a URL.

Ainda na pasta `backend`, inicie o banco pelo Docker. Se ele já estiver disponível pela URL configurada, pule este comando:

```powershell
docker compose up -d
```

Gere o cliente Prisma e aplique as migrações existentes:

```powershell
npm.cmd run prisma:generate
npx.cmd prisma migrate deploy
```

Somente na primeira configuração de um banco vazio, crie os usuários de teste:

```powershell
npm.cmd run prisma:seed
```

O seed não deve ser repetido no mesmo banco. Em seguida, inicie a API:

```powershell
npm.cmd run start:dev
```

A API ficará disponível em `http://localhost:3333`. Deixe esse terminal aberto.

## 2. Iniciar o frontend

Abra outro terminal na raiz do repositório:

```powershell
cd frontend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

O `frontend/.env` deve apontar para a API local:

```dotenv
VITE_API_BASE_URL=http://localhost:3333
VITE_SOCKET_URL=http://localhost:3333
```

Para testar o login com Google localmente, use o mesmo Client ID web nos dois
lados: `VITE_GOOGLE_CLIENT_ID` no `frontend/.env` e `GOOGLE_CLIENT_ID` com
`GOOGLE_AUTH_ENABLED="true"` no `backend/.env`, com `http://localhost:5173`
cadastrado como origem autorizada no console do Google. Sem essas variáveis o
portal segue apenas com o login por senha.

Se `GOOGLE_AUTO_PROVISION="true"` e o e-mail vier de um domínio listado em
`GOOGLE_ALLOWED_DOMAINS`, o primeiro acesso pelo Google já cria e vincula a
conta. Fora desses domínios, é preciso entrar com senha e vincular em **Meu
perfil**, confirmando a senha atual. Quem entrou pelo Google e ainda não tem
senha define a primeira em **Definir senha**, no menu da conta.

Acesse **http://localhost:5173** e entre com o usuário criado pelo seed:

- **E-mail:** `admin@portal-backoffice.local`
- **Senha:** `senha123`

## Nas próximas vezes

Com a configuração concluída, garanta que o banco esteja rodando e execute `npm.cmd run start:dev` na pasta `backend`, e `npm.cmd run dev` em outro terminal na pasta `frontend`.

Após atualizar o código, execute `npm.cmd ci` em cada pasta e, no backend, `npm.cmd run prisma:generate` e `npx.cmd prisma migrate deploy` antes de iniciar. Isso atualiza as dependências, o cliente Prisma e a estrutura do banco.

Para parar, use `Ctrl+C` nos dois terminais. Se iniciou o banco pelo Compose, execute `docker compose stop` na pasta `backend`. Os dados do banco ficam preservados no volume Docker.
