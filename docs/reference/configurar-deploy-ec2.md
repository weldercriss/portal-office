# Configurar deploy de um projeto no EC2

Guia completo, do zero ate a entrega automatica, para colocar uma aplicacao web
(API + painel + Postgres) numa instancia EC2 pequena, com HTTPS, backup e CI/CD.
E o modelo que roda em producao neste repositorio, escrito para ser copiado para
outro projeto.

**Tempo**: 2 a 3 horas na primeira vez. Depois, entregar e um `git push`.

**Custo**: uma `t3.micro` com 15 GB de EBS e um IP elastico fica na casa de
US$ 12/mes fora do free tier. Docker Hub e GitHub Actions, no plano gratuito,
bastam.

---

## Indice

1. [O modelo e as quatro decisoes](#1-o-modelo-e-as-quatro-decisoes)
2. [Pre-requisitos e nomes](#2-pre-requisitos-e-nomes)
3. [Criar a instancia EC2](#3-criar-a-instancia-ec2)
4. [Preparar o repositorio: imagens](#4-preparar-o-repositorio-imagens)
5. [Preparar o repositorio: composicao](#5-preparar-o-repositorio-composicao)
6. [Os scripts de deploy](#6-os-scripts-de-deploy)
7. [Bootstrap da instancia](#7-bootstrap-da-instancia)
8. [O .env de producao](#8-o-env-de-producao)
9. [Primeira subida](#9-primeira-subida)
10. [Dominio e HTTPS](#10-dominio-e-https)
11. [Entrega automatica com GitHub Actions](#11-entrega-automatica-com-github-actions)
12. [Rollback](#12-rollback)
13. [Backup e endurecimento](#13-backup-e-endurecimento)
14. [IAM Role e S3](#14-iam-role-e-s3)
15. [Diagnostico](#15-diagnostico)
16. [Checklist final](#16-checklist-final)

---

## 1. O modelo e as quatro decisoes

```
                      internet
                          |
                    :80   |   :443
                          v
                   meuapp-caddy          borda: TLS, projeto compose "caddy"
                          |                - :80 redireciona 308 -> HTTPS
                          |                - certificado Let's Encrypt automatico
                          v
                   meuapp-web  :8090     Caddy interno
                     |         |           - /        arquivos do SPA
                     |         \--/api/*-> - handle_path corta o prefixo
                     v
                   meuapp-api  :3333     sem porta publicada
                          |
                          v
                   meuapp-postgres       sem porta publicada, volume no EBS
```

Quatro decisoes sustentam esse desenho. Copie o modelo inteiro ou nao copie
nenhum pedaco: cada uma existe para evitar uma falha concreta.

**1. A instancia nao compila nada.** As imagens sao construidas no GitHub
Actions (ou na sua maquina) e publicadas no Docker Hub. O EC2 so puxa e sobe. E
isso que permite rodar numa `t3.micro` de 1 GB, onde o build do Vite morreria
por falta de memoria.

**2. A tag da imagem e o commit.** `sha-<commit curto>`, derivada do git. Nao ha
numero para subir a mao antes de entregar, `docker ps` responde exatamente qual
codigo esta rodando, e voltar para a versao anterior nao exige rebuild. `latest`
existe so como conveniencia de leitura no Docker Hub — nunca como alvo de deploy
(o porque esta na secao 12).

**3. Segredo de producao nunca trafega.** O `.env` e criado a mao na instancia,
com permissao `600`, e nenhum script o envia. Ele nao esta no git, nao esta na
imagem, nao passa pelo CI.

**4. Quem termina o TLS vive noutro projeto compose.** O deploy troca API e
painel a cada entrega; a borda que segura o certificado nao pode cair junto.

---

## 2. Pre-requisitos e nomes

### Contas

| | Para que |
|---|---|
| AWS | a instancia, o IP elastico, opcionalmente S3 e IAM |
| Docker Hub | guardar as imagens (gratuito serve; repositorio publico ou privado) |
| GitHub | o repositorio e o Actions que entrega |
| Registrador de dominio | so se voce quiser HTTPS com nome proprio |

### Na sua maquina

Windows: use **WSL2**. Os scripts sao bash, e o cliente SSH do Windows nao
aplica `chmod` de um jeito que o `ssh` aceite a chave.

```bash
docker --version          # 24+ com o plugin compose
git --version
ssh -V
openssl version
```

### O projeto

O guia assume um monorepo com:

```
apps/api/     backend (Node; aqui NestJS + Prisma)
apps/web/     frontend SPA (aqui React + Vite)
packages/     codigo compartilhado
```

Adapta bem para qualquer coisa que caiba em duas imagens e um Postgres. Se voce
so tem uma API, apague o servico `web` do compose e aponte a borda direto para a
API.

### Nomes usados neste guia

Troque em todo lugar. Escolha agora e seja consistente — metade dos problemas de
deploy e um nome que mudou num arquivo e nao no outro.

| Placeholder | Exemplo | Onde aparece |
|---|---|---|
| `meuapp` | `pingou` | nome do projeto compose, prefixo dos containers e do volume |
| `<DOCKERHUB_USER>` | `weldercris` | namespace das imagens |
| `<IP>` | `18.118.239.204` | IP elastico da instancia |
| `<DOMINIO>` | `app.exemplo.com.br` | dominio publico, se houver |
| `<CHAVE>.pem` | `MeuApp.pem` | chave privada do EC2 |
| `<DB_USER>` / `<DB_NAME>` | `meuapp` / `meuappdb` | Postgres |

---

## 3. Criar a instancia EC2

### 3.1 Lancar

Console AWS > EC2 > **Launch instance**.

| Campo | Valor | Por que |
|---|---|---|
| Nome | `meuapp-prod` | |
| AMI | Ubuntu Server LTS, x86_64 | o repositorio Docker tem build para os codinomes LTS |
| Tipo | `t3.micro` | o build acontece fora; 1 GB basta com swap |
| Key pair | **crie um novo**, RSA ou ED25519, formato `.pem` | e a unica forma de entrar; baixe e guarde |
| Disco | 15 GB gp3 | o volume do Postgres vive aqui |
| Security group | crie novo, regras abaixo | |

Guarde o `.pem` em `ssh/<CHAVE>.pem` dentro do repositorio e **adicione `ssh/`
ao `.gitignore` e ao `.dockerignore` antes do primeiro commit**.

### 3.2 Security group

| Porta | Origem | Por que |
|---|---|---|
| 22 | `0.0.0.0/0` ou seu IP | SSH |
| 80 | `0.0.0.0/0` | redirecionamento para HTTPS e validacao do certificado |
| 443 | `0.0.0.0/0` | HTTPS |

A 80 continua necessaria **depois** do HTTPS: e por ela que o Let's Encrypt
valida o dominio nas renovacoes. Ela nao serve a aplicacao — so devolve um 308.

Sobre deixar a 22 aberta: se voce acessa sempre da mesma rede, restrinja ao seu
IP e pronto. Se nao (rede movel, escritorios diferentes), abrir e uma escolha
defensavel — o que protege o SSH e a chave, nao o filtro de origem. A AMI ja vem
com `PasswordAuthentication no` e `PermitRootLogin prohibit-password`. Sem a
chave privada, nenhuma varredura entra. O `fail2ban` da secao 13 corta os bots
que insistem, o que economiza CPU numa instancia pequena.

Confirme depois de subir:

```bash
sudo sshd -T | grep -i passwordauthentication   # tem de dizer "no"
```

**Nao abra 3333 nem 5432.** Eles nao publicam porta; abrir no security group so
daria uma falsa sensacao de acesso.

> **Cuidado ao editar regras depois.** Se a conta tem mais de um security group,
> va pela aba **Seguranca** da instancia, nao pela lista de grupos: assim o
> console so oferece o grupo que de fato vale para ela.

### 3.3 IP elastico

EC2 > **Elastic IPs** > Allocate > **Associate** com a instancia.

Faca isso mesmo sem dominio. Um IP dinamico muda a cada stop/start e derrubaria
DNS e certificado juntos. Alocado nao basta: na tela de Elastic IPs, a coluna
*ID da instancia associada* nao pode estar vazia.

### 3.4 Primeiro acesso

```bash
chmod 400 ssh/<CHAVE>.pem
ssh -i ssh/<CHAVE>.pem ubuntu@<IP> 'uname -m && free -m'
```

Anote a arquitetura: `x86_64` significa `linux/amd64` nos builds. Se voce
escolheu Graviton (`aarch64`), use `linux/arm64` em todo lugar onde a plataforma
aparecer.

---

## 4. Preparar o repositorio: imagens

Nesta secao e na proxima voce cria os arquivos que definem **o que roda**. Cada
bloco e para copiar, trocando `meuapp`.

### 4.1 `.dockerignore`

Faca este primeiro. Ele decide o que entra no contexto de build — e o que **nao**
entra.

```gitignore
# Dependencias e artefatos sao reconstruidos dentro da imagem.
node_modules
**/node_modules
dist
**/dist
build
**/build
**/*.tsbuildinfo

# Segredos entram por env_file em tempo de execucao, nunca assados na imagem.
.env
.env.*
!.env.example

# A chave do EC2. Sem esta linha ela entra no contexto de build e o "COPY . ."
# do estagio de build a grava numa camada. O estagio final nao a copia adiante,
# mas a camada intermediaria fica no cache — e uma chave privada nao tem o que
# fazer ali.
ssh

# Ferramentas de deploy: rodam na maquina, nunca dentro da imagem.
scripts

# Ruido que so existe na maquina de quem desenvolve.
.git
.gitignore
.vscode
.idea
*.log
coverage
uploads
docker-compose*.yml

# Documentacao nao muda o que a imagem faz, e invalidaria camada a cada edicao.
docs
README.md
```

E no `.gitignore`, no minimo:

```gitignore
node_modules/
dist/
.env
.env.*.local
.env.production
ssh/
*.log
```

### 4.2 `apps/api/Dockerfile`

Tres estagios. O primeiro instala dependencias a partir **so** dos manifestos —
enquanto `package.json` e `package-lock.json` nao mudam, o Docker reaproveita a
camada e o build fica rapido.

```dockerfile
# --- dependencias -----------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# --- build ------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate -w apps/api
RUN npm run build -w apps/api

# --- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# tini vira PID 1 e repassa os sinais, para o container parar limpo.
RUN apk add --no-cache tini

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# O seed importa codigo de src/. Sem esta copia ele quebra no import e a base
# nova fica sem usuario administrador — falha que so aparece no primeiro login,
# como "credenciais invalidas" e nenhuma pista no log.
COPY --from=build /app/apps/api/src/common ./apps/api/src/common
COPY apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3333
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/main.js"]
```

Duas armadilhas se voce usa Prisma:

- Copie `prisma/` para a imagem final. Sem o diretorio de migracoes, o entrypoint
  nao tem o que aplicar.
- Deixe `prisma.config.ts` **de fora**. Ele carrega o `.env` da raiz do monorepo,
  que nao existe na imagem. As variaveis vem do ambiente, e o entrypoint aponta o
  schema explicitamente.

### 4.3 `apps/api/docker-entrypoint.sh`

Aplica as migracoes pendentes antes de subir. `migrate deploy` so executa o que
ja esta versionado: nunca gera migracao nova nem apaga dado, entao e seguro
rodar a cada start.

```sh
#!/bin/sh
set -e

echo "[entrypoint] aplicando migracoes pendentes..."
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "[entrypoint] banco em dia"

# RUN_SEED=true cria o usuario administrador numa base vazia. Deixe desligado
# depois do primeiro start.
if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] rodando seed..."
  # tsx direto, e nao "prisma db seed": aquele procura a configuracao em
  # prisma.config.ts, que fica de fora da imagem de proposito.
  if npx tsx prisma/seed.ts; then
    echo "[entrypoint] seed concluido"
  else
    # Nao aborta: numa base ja semeada o seed e redundante e a API deve subir.
    # Mas grita, porque seed que falha em silencio vira "credenciais invalidas"
    # na tela de login sem nenhuma pista no log.
    echo "[entrypoint] ================================================"
    echo "[entrypoint] ATENCAO: O SEED FALHOU. Se esta e uma base nova,"
    echo "[entrypoint] nao existe usuario administrador e o login nao vai"
    echo "[entrypoint] funcionar. Veja o erro acima."
    echo "[entrypoint] ================================================"
  fi
fi

exec "$@"
```

Commite com permissao de execucao:
`git update-index --chmod=+x apps/api/docker-entrypoint.sh`.

### 4.4 `apps/web/Dockerfile`

```dockerfile
# --- dependencias -----------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# --- build ------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O Vite grava as variaveis VITE_* dentro do bundle no momento do build, entao
# ela precisa chegar como argumento. O padrao "/api" e relativo de proposito:
# funciona em localhost, no IP do EC2 e sob qualquer dominio, sem rebuild.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w apps/web

# --- runtime ----------------------------------------------------------------
FROM caddy:2-alpine AS runner
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /usr/share/caddy
EXPOSE 80
```

**A decisao mais importante deste arquivo e `VITE_API_URL=/api`.** URL relativa
significa que o bundle nunca sabe o dominio: trocar de dominio, ou acessar pelo
IP, nao exige rebuild de imagem nenhuma. Se voce assar `https://api.exemplo.com`
no bundle, cada mudanca de endereco vira um ciclo completo de build e deploy — e
voce ganha CORS de brinde.

Caddy no lugar de nginx porque quem termina TLS na frente ja e um Caddy: uma
ferramenta a menos para conhecer.

### 4.5 `apps/web/Caddyfile`

O Caddy de dentro do container do painel, em HTTP puro.

```caddyfile
:80 {
	encode zstd gzip
	root * /usr/share/caddy

	# O Vite grava hash no nome dos bundles, entao eles nunca mudam de conteudo.
	#
	# O sw.js e o registerSW.js do PWA ficam de fora: eles mantem o nome entre
	# versoes. Congelados por um ano, o navegador serviria do cache HTTP o worker
	# velho, que serviria do Cache Storage o bundle velho — o app nunca mais
	# atualizaria.
	@immutable {
		path *.js *.css *.woff *.woff2
		not path /sw.js /registerSW.js
	}
	header @immutable Cache-Control "public, max-age=31536000, immutable"

	@serviceworker path /sw.js /registerSW.js
	header @serviceworker Cache-Control "no-cache"

	# Imagens vem de public/ sem hash no nome: cache curto para a troca aparecer.
	@images path *.png *.jpg *.jpeg *.gif *.svg *.ico *.webp
	header @images Cache-Control "public, max-age=604800"

	# A API vive sob o mesmo dominio. handle_path (e nao handle) corta o /api do
	# caminho, entao /api/auth/login chega na API como /auth/login. Se a sua API
	# nao tem prefixo global, com "handle" puro toda chamada viraria 404.
	# Sem CORS, e sem URL de API assada no bundle.
	handle_path /api/* {
		reverse_proxy api:3333
	}

	# SPA: rota que o Caddy nao conhece e do router, entao devolve o index.
	# Precisa vir DEPOIS do handle_path, senao uma rota de API inexistente
	# devolveria o index.html em vez do 404 da API.
	handle {
		try_files {path} /index.html
		file_server
	}
}
```

---

## 5. Preparar o repositorio: composicao

### 5.1 `docker-compose.prod.yml`

O que roda no EC2. **Nenhum build**: as imagens vem prontas do Docker Hub.

```yaml
# O deploy.sh copia este arquivo para ~/meuapp/docker-compose.yml no EC2 e sobe
# com IMAGE_TAG=sha-<commit> explicito nos dois comandos (pull e up).
#
# IMAGE_TAG SEMPRE explicito, na mao tambem: o ":latest" do default existe para
# o arquivo ser valido sozinho, nao para ser usado. Ver a secao 12.
#
# Mesmo nome de projeto do compose local, de proposito: e o prefixo do volume.
name: meuapp

services:
  postgres:
    image: postgres:16-alpine
    container_name: meuapp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-meuappdb}
      POSTGRES_USER: ${POSTGRES_USER:-meuapp}
      # Sem valor padrao de proposito: em producao, subir com a senha de exemplo
      # e pior do que nao subir. O compose para aqui se o .env nao definir.
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?defina POSTGRES_PASSWORD no .env}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-meuapp} -d ${POSTGRES_DB:-meuappdb}']
      interval: 10s
      timeout: 5s
      retries: 5
    # Sem porta publicada: quem precisa do banco e a API, pela rede do compose.

  api:
    image: ${DOCKER_NAMESPACE:-<DOCKERHUB_USER>}/meuapp-api:${IMAGE_TAG:-latest}
    container_name: meuapp-api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      # Vence o que veio do .env: dentro da rede do compose o banco atende pelo
      # nome do servico, sem depender de IP nem de encaminhamento de porta.
      DATABASE_URL: postgresql://${POSTGRES_USER:-meuapp}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-meuappdb}?schema=public
      API_PORT: 3333
      NODE_ENV: production
      # Repasse explicito: sem esta linha, "RUN_SEED=true docker compose up -d api"
      # define a variavel no shell e ela nunca chega ao container — o seed nao
      # roda e a base fica sem administrador, sem nenhum erro aparecer.
      RUN_SEED: ${RUN_SEED:-}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3333/health', { signal: AbortSignal.timeout(3000) }).then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 60s
    # Tambem sem porta publicada: o Caddy do web e a unica porta de entrada.

  web:
    image: ${DOCKER_NAMESPACE:-<DOCKERHUB_USER>}/meuapp-web:${IMAGE_TAG:-latest}
    container_name: meuapp-web
    restart: unless-stopped
    ports:
      - '${WEB_PORT:-80}:80'
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'wget -q -T 3 -O /dev/null http://127.0.0.1/ && wget -q -T 3 -O /dev/null http://127.0.0.1/api/health']
      interval: 10s
      timeout: 8s
      retries: 6
      start_period: 15s

volumes:
  postgres_data:
```

Pontos que valem entender antes de copiar:

- **`/health` na API e obrigatorio.** Crie um endpoint que consulte o banco e
  devolva 200. O deploy espera por ele; sem healthcheck real, `up --wait` da
  verde com a API quebrada.
- **`start_period: 60s` na API** existe porque o primeiro start roda as
  migracoes. Sem essa folga, o healthcheck falha durante a migracao e o compose
  desiste.
- **O healthcheck do `web` testa `/api/health`**, nao so `/`. Isso valida o
  caminho real do navegador: painel -> proxy -> API.
- **`${POSTGRES_PASSWORD:?...}`** para o compose morrer com mensagem clara em vez
  de subir um banco com senha errada.

### 5.2 `Caddyfile` (borda)

Na raiz do repositorio. O unico servico exposto na internet.

```caddyfile
# O endereco do site vem da env APP_DOMAIN, que o compose sempre preenche: o
# dominio real em producao, ou ":80" (HTTP puro, sem TLS) quando APP_DOMAIN
# esta vazia — e o que permite acessar pelo IP do EC2 sem dominio.
#
# Nao use o default embutido do Caddy ({$APP_DOMAIN::80}): quando a variavel
# existe mas esta vazia, o Caddy usa o valor vazio em vez do default e o arquivo
# nao parseia. Por isso o default vive no compose, como ${APP_DOMAIN:-:80}.
{$APP_DOMAIN} {
	encode zstd gzip

	header {
		# Um ano de HTTPS obrigatorio. O navegador passa a recusar http:// neste
		# host sozinho, o que fecha a janela do primeiro acesso, em que o 308
		# ainda trafega em texto claro.
		Strict-Transport-Security "max-age=31536000; includeSubDomains"

		# Impede o navegador de adivinhar o tipo de um arquivo pelo conteudo. Sem
		# isto, um upload de texto pode acabar interpretado como script.
		X-Content-Type-Options "nosniff"

		# Ninguem embute este painel num iframe: e o que impede clickjacking.
		X-Frame-Options "DENY"

		# A URL completa nao vaza para sites externos.
		Referrer-Policy "strict-origin-when-cross-origin"

		# O painel nao usa camera, microfone nem localizacao. Negar de saida
		# evita que um script injetado peca.
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"

		# CSP: o app carrega a si mesmo e as fontes do Google, nada alem disso.
		# style-src precisa de unsafe-inline se voce usa uma lib de graficos que
		# gera estilo inline em SVG; sem isso o dashboard renderiza em branco.
		Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"

		# Nao anunciar o servidor: nao impede um ataque, mas evita entregar de
		# graca a versao exata para quem procura alvo por fingerprint.
		-Server
	}

	# Repassa tudo para o Caddy interno do container web, que ja separa o SPA do
	# /api. Aqui NAO ha handle_path: quem corta o prefixo e o interno. Cortar
	# duas vezes daria 404 em tudo.
	reverse_proxy web:80
}
```

### 5.3 `docker-compose.caddy.yml`

```yaml
# Caddy de borda: termina o TLS e fica na frente do compose da aplicacao.
#
# Projeto compose PROPRIO, de proposito: o deploy troca api e web a cada entrega
# e nao pode derrubar quem termina o TLS. Sobe assim, da raiz do projeto no EC2:
#
#   docker compose -p caddy -f docker-compose.caddy.yml up -d
#
# O "-p caddy" importa: e o nome do projeto que da nome aos volumes dos
# certificados (caddy_caddy_data). Subir sem ele criaria volumes novos e o Caddy
# pediria certificado do zero, esbarrando no rate limit do Let's Encrypt.
services:
  caddy:
    image: caddy:2-alpine
    container_name: meuapp-caddy
    restart: unless-stopped
    environment:
      # ":-" cobre ausente e vazia. O fallback ":80" faz o Caddy subir em HTTP
      # puro, que e o modo de acesso por IP.
      APP_DOMAIN: ${APP_DOMAIN:-:80}
    ports:
      - '80:80'
      - '443:443'
      # 443/udp e o HTTP/3. Inofensivo se o security group nao liberar UDP.
      - '443:443/udp'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      # Persistem os certificados entre restarts. Sem isto, todo restart pede
      # certificado novo.
      - caddy_data:/data
      - caddy_config:/config
    # Sem depends_on: os servicos da aplicacao estao noutro projeto, e o compose
    # so ordena o que ele mesmo sobe. O Caddy tolera destino fora do ar (responde
    # 502 e volta a resolver o nome quando o container reaparece) — e isso que
    # mantem a borda de pe durante a troca de versao.
    networks:
      - meuapp

networks:
  meuapp:
    # Rede criada pelo compose da aplicacao. "external" = nao cria, so entra na
    # existente. O nome sai do projeto do outro compose (name: meuapp), entao e
    # meuapp_default. Sem isto, o nome "web" do Caddyfile nao resolve e toda
    # requisicao vira 502.
    name: meuapp_default
    external: true

volumes:
  caddy_data:
  caddy_config:
```

### 5.4 `.env.production.example`

O modelo do arquivo que vive **so na instancia**. Este exemplo vai para o git; o
preenchido, nunca.

```ini
# Modelo do .env que vive em /home/ubuntu/meuapp/.env no EC2.
# Copie, preencha os segredos, e NUNCA versione o arquivo preenchido.
# Nenhum script envia este arquivo: ele e criado a mao, uma vez, na instancia.
NODE_ENV=production

POSTGRES_DB=meuappdb
POSTGRES_USER=meuapp
# openssl rand -hex 32
POSTGRES_PASSWORD=TROQUE-ME

# Dentro da rede do compose o banco atende pelo nome do servico. A senha aqui
# tem de ser a mesma de POSTGRES_PASSWORD, acima.
DATABASE_URL=postgresql://meuapp:TROQUE-ME@postgres:5432/meuappdb?schema=public

# openssl rand -hex 48, um valor diferente do outro
JWT_ACCESS_SECRET=TROQUE-ME
JWT_REFRESH_SECRET=TROQUE-ME
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30

API_PORT=3333

# 80 para o Caddy do container web atender direto na porta padrao. Se puser um
# Caddy de borda ou um ALB na frente para o TLS, use 8090 aqui.
WEB_PORT=80

# Dominio de producao. Usado SO pelo Caddy de borda, para emitir o certificado.
# O bundle do painel nunca sabe o dominio: ele chama /api relativo, sempre.
#
# Deixe VAZIO para acessar pelo IP do EC2, sem TLS.
# Ao preencher, mude WEB_PORT acima para 8090.
APP_DOMAIN=

# VITE_API_URL nao aparece aqui de proposito: o Vite grava as variaveis VITE_*
# dentro do bundle no momento do build, entao ela ja foi decidida na imagem.
# Po-la aqui daria a impressao falsa de que muda algo.

ADMIN_EMAIL=admin@exemplo.com
# openssl rand -hex 16 — trocada pelo painel logo apos o primeiro login
ADMIN_PASSWORD=TROQUE-ME
ADMIN_NAME=Admin

# Tag das imagens puxadas do Docker Hub. O deploy.sh sobrescreve com a versao
# exata a cada entrega; latest e o padrao para uma subida manual na instancia.
IMAGE_TAG=latest

# Namespace do Docker Hub. So mude se as imagens mudarem de conta.
DOCKER_NAMESPACE=<DOCKERHUB_USER>
```

---

## 6. Os scripts de deploy

Oito arquivos em `scripts/`. Rodam no WSL/Linux, sempre da raiz do repositorio.
Os tres primeiros sao bibliotecas carregadas com `.` (ponto), sem shebang.

```
scripts/
  lib/image-tag.sh       de onde vem a tag, e a trava de arvore suja
  lib/ssh-key.sh         resolve a chave privada
  lib/remote-deploy.sh   o que roda DENTRO do EC2
  build-push.sh          constroi e publica no Docker Hub
  deploy.sh              orquestra tudo
  ec2-bootstrap.sh       prepara uma instancia nova
  ec2-hardening.sh       fail2ban + backup diario  (secao 13)
  fetch-backup.sh        traz as copias para fora do EBS  (secao 13)
```

### 6.1 `scripts/lib/image-tag.sh`

```bash
# Sem shebang de proposito: para ser carregado com ".", nao executado.
#
# A identidade de uma entrega e o commit, e nao um numero digitado a mao.
#
# Uso:
#   . scripts/lib/image-tag.sh
#   TAG="$(tag_da_imagem)"      # sha-a1b2c3d
TAG_RE='^sha-[0-9a-f]{7,40}$'

tag_da_imagem() {
  local sha
  sha="$(git rev-parse --short HEAD 2>/dev/null)" || {
    echo "erro: nao consegui ler o commit atual (git rev-parse HEAD)." >&2
    return 1
  }
  echo "sha-$sha"
}

# Uma tag sha promete que a imagem contem exatamente aquele commit. Buildar com
# a arvore suja quebra essa promessa em silencio: a imagem sai com codigo que
# nao esta em lugar nenhum, e o dia em que voce voltar para essa tag vai receber
# outra coisa. Por isso a checagem barra ANTES do build, e nao depois do push.
#
# --untracked-files=no de proposito: arquivo nao rastreado (.env, backups) nao
# entra na imagem, entao nao torna a tag mentirosa.
exigir_arvore_limpa() {
  if [ "${PERMITIR_ARVORE_SUJA:-}" = "1" ]; then
    echo "aviso: PERMITIR_ARVORE_SUJA=1 — a tag sha NAO vai descrever a imagem." >&2
    return 0
  fi

  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "erro: ha alteracao rastreada nao commitada. A tag sai do commit, entao" >&2
    echo "a imagem sairia com codigo que nao esta em nenhum commit." >&2
    git status --short --untracked-files=no >&2
    echo >&2
    echo "Commite (ou descarte) e repita. Para forcar mesmo assim:" >&2
    echo "  PERMITIR_ARVORE_SUJA=1 bash scripts/deploy.sh" >&2
    return 1
  fi
}

# Le APP_VERSION so para publicar uma tag legivel ao lado da sha. Ela NAO e o
# que o deploy sobe. O "|| true" e proposital: sob "set -e", um sed que falha
# derrubaria o deploy inteiro por causa de uma tag decorativa.
versao_do_painel() {
  sed -n "s/.*APP_VERSION *= *'\([^']*\)'.*/\1/p" apps/web/src/version.ts 2>/dev/null || true
}
```

### 6.2 `scripts/lib/ssh-key.sh`

```bash
# Sem shebang de proposito: para ser carregado com ".", nao executado.
#
# A chave vive em ssh/<CHAVE>.pem, dentro de /mnt/c. Vista do WSL ela aparece
# como 0777, e o cliente SSH recusa a conexao com "UNPROTECTED PRIVATE KEY FILE"
# — permissao do Windows nao traduz para modo POSIX. A saida e manter uma copia
# dentro do sistema de arquivos do Linux, onde chmod vale de verdade.
ensure_ssh_key() {
  local source="${SSH_KEY_SOURCE:-ssh/<CHAVE>.pem}"
  local target="${SSH_KEY:-$HOME/.ssh/meuapp-ec2.pem}"

  # No Actions (ou em outro Linux), a chave ja foi criada no filesystem local.
  # SSH_KEY explicita esse arquivo; nao exige a copia original do Windows.
  if [ -n "${SSH_KEY:-}" ]; then
    if [ ! -f "$target" ]; then
      echo "erro: SSH_KEY nao aponta para uma chave existente: $target" >&2
      return 1
    fi
    chmod 400 "$target" || return 1
    printf '%s\n' "$target"
    return 0
  fi

  if [ ! -f "$source" ]; then
    echo "erro: chave nao encontrada em $source" >&2
    echo "Rode este script da raiz do repositorio, dentro do WSL." >&2
    return 1
  fi

  mkdir -p "$(dirname "$target")" || return 1
  # cmp para nao recopiar a cada execucao, e para pegar uma troca de chave.
  if [ ! -f "$target" ] || ! cmp -s "$source" "$target"; then
    cp "$source" "$target" || return 1
  fi
  chmod 400 "$target" || return 1

  # Unica coisa que vai para stdout: e o valor de retorno da funcao.
  echo "$target"
}
```

### 6.3 `scripts/lib/remote-deploy.sh`

O unico script que roda **dentro** da instancia. Chega la pelo stdin de
`bash -s`, entao nao precisa ser instalado no servidor.

```bash
#!/usr/bin/env bash
# Executado no EC2 por deploy.sh via SSH; recebe somente argumentos validados.
# O .env permanece na instancia. Nenhum segredo e transmitido por este helper.
set -euo pipefail

cd "$1"
export IMAGE_TAG="$2"
export DOCKER_NAMESPACE="$3"
DEPLOY_TIMEOUT="$4"

docker compose pull
docker compose up -d --wait --wait-timeout "$DEPLOY_TIMEOUT"

# Confere tambem o caminho real usado pelo navegador: Caddy do frontend -> API.
#
# O </dev/null nao e enfeite: este script chega aqui pelo stdin de "bash -s", e
# o "exec -T" repassa esse mesmo stdin para dentro do container. Sem ele, o
# docker consome o resto do arquivo — o "ps" abaixo e a escrita do .deployed-tag
# somem, o bash encontra EOF e sai com zero. O deploy fica verde sem ter
# registrado a tag, e so se descobre quando alguem precisa saber o que esta no ar.
echo "==> verificando frontend e /api/health"
docker compose exec -T web sh -ec '
  wget -q -T 5 -O /dev/null http://127.0.0.1/
  wget -q -T 5 -O /dev/null http://127.0.0.1/api/health
' </dev/null
docker compose ps --format '{{.Service}}\t{{.Image}}\t{{.Status}}'

# So registra sucesso depois de todas as verificacoes. A troca atomica preserva
# a ultima tag saudavel mesmo se o processo for interrompido durante a escrita.
marker="$(mktemp .deployed-tag.XXXXXX)"
trap 'rm -f -- "$marker"' EXIT
printf '%s\n' "$IMAGE_TAG" > "$marker"
mv -f -- "$marker" .deployed-tag
trap - EXIT
```

### 6.4 `scripts/build-push.sh`

```bash
#!/usr/bin/env bash
# Constroi as imagens de producao e publica no Docker Hub. Roda no WSL, da raiz
# do repositorio.
#
#   bash scripts/build-push.sh
#   PLATFORM=linux/arm64 bash scripts/build-push.sh    # se o EC2 for Graviton
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

NAMESPACE="${DOCKER_NAMESPACE:-<DOCKERHUB_USER>}"
PLATFORM="${PLATFORM:-linux/amd64}"

. scripts/lib/image-tag.sh

exigir_arvore_limpa
TAG="$(tag_da_imagem)"
VERSAO="$(versao_do_painel)"

# Falhar aqui custa segundos; falhar no push custa o build inteiro.
#
# Duas fontes, e nao uma: "docker info" ja deixou de reportar o Username com o
# daemon ocupado logo apos outro build. O config.json e a fonte estavel; o
# docker info cobre o caso de credential helper.
esta_logado() {
  docker info 2>/dev/null | grep -qi 'username:' && return 0
  [ -f "$HOME/.docker/config.json" ] \
    && grep -q 'index.docker.io' "$HOME/.docker/config.json" && return 0
  return 1
}

if [ "${SKIP_LOGIN_CHECK:-}" != "1" ] && ! esta_logado; then
  echo "erro: sem login no Docker Hub. Rode:" >&2
  echo "  docker login -u $NAMESPACE" >&2
  exit 1
fi

echo "==> tag $TAG${VERSAO:+ | versao $VERSAO} | namespace $NAMESPACE | plataforma $PLATFORM"

build_and_push() {
  local name="$1" dockerfile="$2"
  local repo="$NAMESPACE/meuapp-$name"
  local tags=(-t "$repo:$TAG" -t "$repo:latest")
  # "if" e nao "[ ... ] && ...": sob "set -e", um teste falso como ultimo
  # comando da linha derruba o script — aqui, so por nao haver APP_VERSION.
  if [ -n "$VERSAO" ]; then
    tags+=(-t "$repo:v$VERSAO")
  fi

  echo "==> build $repo:$TAG"
  docker build --platform "$PLATFORM" -f "$dockerfile" "${tags[@]}" "$ROOT"

  echo "==> push $repo:$TAG"
  docker push "$repo:$TAG"
  docker push "$repo:latest"
  if [ -n "$VERSAO" ]; then
    docker push "$repo:v$VERSAO"
  fi
}

build_and_push api apps/api/Dockerfile
build_and_push web apps/web/Dockerfile

echo
echo "publicado:"
echo "  $NAMESPACE/meuapp-api:$TAG"
echo "  $NAMESPACE/meuapp-web:$TAG"
```

### 6.5 `scripts/deploy.sh`

O que voce chama no dia a dia.

```bash
#!/usr/bin/env bash
# Entrega: constroi, publica no Docker Hub e faz o EC2 puxar. Roda no WSL ou
# Linux (inclusive no GitHub Actions), da raiz do repositorio.
#
#   bash scripts/deploy.sh                 # sobe o commit atual (HEAD)
#   bash scripts/deploy.sh sha-9f3e001     # volta para uma imagem ja publicada
#   SKIP_BUILD=1 bash scripts/deploy.sh    # so reenviar o compose e subir
#   PLATFORM=linux/arm64 bash scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

EC2_HOST="${EC2_HOST:-<IP>}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_DIR="${EC2_DIR:-/home/$EC2_USER/meuapp}"
DOCKER_NAMESPACE="${DOCKER_NAMESPACE:-<DOCKERHUB_USER>}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-180}"

# Os valores tambem entram em comandos SSH e destinos SCP. Restrinja a entrada
# antes de conectar: IPv4/DNS, usuario Linux e caminho absoluto sem espacos.
if [[ ! "$EC2_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] ||
   [[ ! "$EC2_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] ||
   [[ ! "$EC2_DIR" =~ ^/[a-zA-Z0-9_./-]+$ ]] ||
   [[ ! "$DOCKER_NAMESPACE" =~ ^[a-z0-9]+([._-][a-z0-9]+)*$ ]]; then
  echo "erro: EC2_HOST, EC2_USER, EC2_DIR ou DOCKER_NAMESPACE invalido." >&2
  exit 1
fi
if [[ ! "$DEPLOY_TIMEOUT" =~ ^[1-9][0-9]{0,3}$ ]] || [ "$DEPLOY_TIMEOUT" -gt 3600 ]; then
  echo "erro: DEPLOY_TIMEOUT deve ser um numero de segundos entre 1 e 3600." >&2
  exit 1
fi
if [ "$#" -gt 1 ]; then
  echo "uso: bash scripts/deploy.sh [sha-<commit>]" >&2
  exit 1
fi

. scripts/lib/image-tag.sh

# Com argumento, o pedido e subir uma imagem que ja existe no registry (voltar
# para a anterior, ou repetir uma entrega). Buildar nesse caso sobrescreveria a
# tag pedida com o codigo de agora — que e o oposto do que se quer.
if [ "$#" -gt 0 ]; then
  TAG="$1"
  SKIP_BUILD=1
else
  exigir_arvore_limpa
  TAG="$(tag_da_imagem)"
fi

# "latest" e recusado de proposito: ver a secao 12.
if [[ ! "$TAG" =~ $TAG_RE ]]; then
  echo "erro: tag invalida: '$TAG'. Esperado sha-<commit>, ex.: sha-a1b2c3d." >&2
  exit 1
fi

. scripts/lib/ssh-key.sh
KEY="$(ensure_ssh_key)"
SSH_OPTS=(-i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3)
if [ -n "${SSH_KNOWN_HOSTS:-}" ]; then
  if [ ! -s "$SSH_KNOWN_HOSTS" ] || [ ! -r "$SSH_KNOWN_HOSTS" ]; then
    echo "erro: SSH_KNOWN_HOSTS deve apontar para um known_hosts legivel." >&2
    exit 1
  fi
  SSH_OPTS+=(-o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$SSH_KNOWN_HOSTS")
elif [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  echo "erro: em CI, informe SSH_KNOWN_HOSTS com a chave publica ja verificada." >&2
  exit 1
else
  # Compatibilidade com o fluxo manual no WSL. No Actions, a chave e fixada.
  SSH_OPTS+=(-o StrictHostKeyChecking=accept-new)
fi
REMOTE="$EC2_USER@$EC2_HOST"

if [ "${SKIP_BUILD:-}" != "1" ]; then
  bash scripts/build-push.sh
fi

# O .env de producao guarda os segredos e vive so na instancia. Se ele nao
# existir, parar aqui e melhor do que subir um Postgres sem senha definida.
echo "==> conferindo o .env de producao no EC2"
if ! ssh "${SSH_OPTS[@]}" "$REMOTE" "test -f '$EC2_DIR/.env'"; then
  echo "erro: $EC2_DIR/.env nao existe na instancia. Veja a secao 8 do guia." >&2
  exit 1
fi

# Qual tag esta no ar agora. E o que responde "de onde eu vim" na hora de voltar.
TAG_ANTERIOR="$(ssh "${SSH_OPTS[@]}" "$REMOTE" "cat '$EC2_DIR/.deployed-tag' 2>/dev/null || true")"
echo "==> tag pedida: $TAG | no ar hoje: ${TAG_ANTERIOR:-<desconhecida>}"

echo "==> enviando docker-compose.prod.yml"
scp "${SSH_OPTS[@]}" docker-compose.prod.yml "$REMOTE:$EC2_DIR/docker-compose.yml"

# O Caddy de borda so entra em cena quando ha dominio; enviar os arquivos e
# barato e deixa a instancia pronta para o dia em que APP_DOMAIN for preenchida.
echo "==> enviando Caddyfile e docker-compose.caddy.yml"
scp "${SSH_OPTS[@]}" Caddyfile docker-compose.caddy.yml "$REMOTE:$EC2_DIR/"

echo "==> puxando $TAG e subindo"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "bash -s -- '$EC2_DIR' '$TAG' '$DOCKER_NAMESPACE' '$DEPLOY_TIMEOUT'" < scripts/lib/remote-deploy.sh

cat <<EOF

pronto: http://$EC2_HOST   ($TAG)

Para voltar para a anterior:
  bash scripts/deploy.sh ${TAG_ANTERIOR:-sha-<commit>}
EOF
```

### 6.6 `scripts/ec2-bootstrap.sh`

Roda **uma vez por instancia**. E idempotente.

```bash
#!/usr/bin/env bash
# Prepara uma instancia EC2 nova: swap, Docker Engine, grupo docker, diretorio
# do projeto e login no Docker Hub (necessario so se as imagens forem privadas).
set -euo pipefail

cd "$(dirname "$0")/.."

EC2_HOST="${EC2_HOST:-<IP>}"
EC2_USER="${EC2_USER:-ubuntu}"
EC2_DIR="${EC2_DIR:-/home/$EC2_USER/meuapp}"
NAMESPACE="${DOCKER_NAMESPACE:-<DOCKERHUB_USER>}"

. scripts/lib/ssh-key.sh
KEY="$(ensure_ssh_key)"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new)
REMOTE="$EC2_USER@$EC2_HOST"

echo "==> preparando $REMOTE"
ssh "${SSH_OPTS[@]}" "$REMOTE" 'bash -s' <<'REMOTO'
set -euo pipefail

# A instancia tem ~1 GB e nenhum swap. Postgres, API e Caddy juntos nesse espaco
# vivem no limite: sem swap, o kernel mata o processo mais gordo no pico em vez
# de deixar a maquina ficar lenta por um instante.
if [ ! -f /swapfile ]; then
  echo "[bootstrap] criando swap de 2 GB"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "[bootstrap] swap ja existe"
fi

if command -v docker >/dev/null 2>&1; then
  echo "[bootstrap] docker ja instalado: $(docker --version)"
else
  echo "[bootstrap] instalando Docker Engine"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl gnupg >/dev/null
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  # O codinome sai da propria instancia. Se uma versao muito nova ainda nao tiver
  # repositorio no download.docker.com, troque $VERSION_CODENAME pelo codinome
  # da LTS anterior (ex.: "noble") — o pacote funciona.
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi

# Vale a partir da proxima sessao de login. Como cada ssh abre uma sessao nova,
# o proximo comando deste script ja pega o grupo.
sudo usermod -aG docker "$USER"
mkdir -p "$HOME/meuapp"

echo "[bootstrap] arquitetura da instancia: $(uname -m)"
free -m | tail -2
REMOTO

echo
echo "==> enviando o modelo do .env de producao"
scp "${SSH_OPTS[@]}" .env.production.example "$REMOTE:$EC2_DIR/.env.example"

echo
echo "==> login no Docker Hub (necessario so se as imagens forem privadas)"
if ssh "${SSH_OPTS[@]}" "$REMOTE" "grep -q 'index.docker.io' ~/.docker/config.json 2>/dev/null"; then
  echo "ja ha login gravado na instancia; pulando."
else
  echo "Crie um Access Token em https://app.docker.com/settings/personal-access-tokens"
  echo "com escopo Read-only: o EC2 so precisa puxar imagens, nunca publicar."
  read -rsp "Access Token do Docker Hub para $NAMESPACE (ENTER para pular): " TOKEN
  echo
  if [ -n "$TOKEN" ]; then
    printf '%s' "$TOKEN" \
      | ssh "${SSH_OPTS[@]}" "$REMOTE" "docker login -u '$NAMESPACE' --password-stdin"
  fi
fi

echo
ssh "${SSH_OPTS[@]}" "$REMOTE" 'docker --version && docker compose version && ls -a ~/meuapp'
```

---

## 7. Bootstrap da instancia

Do WSL, na raiz do repositorio:

```bash
bash scripts/ec2-bootstrap.sh
```

Faz, em ordem: swap de 2 GB, Docker Engine com o plugin do compose, usuario no
grupo `docker`, cria `~/meuapp`, envia o modelo do `.env` e, se as imagens forem
privadas, grava o `docker login`.

Confirme:

```bash
ssh -i ~/.ssh/meuapp-ec2.pem ubuntu@<IP> 'docker compose version && free -m'
```

O `docker compose version` precisa ser v2 (o plugin, nao o `docker-compose`
antigo) — o deploy usa `up --wait --wait-timeout`, que so existe no v2.

---

## 8. O .env de producao

Vive **so na instancia**, em `/home/ubuntu/meuapp/.env`, com permissao `600`.

```bash
ssh -i ~/.ssh/meuapp-ec2.pem ubuntu@<IP>
cd ~/meuapp
cp .env.example .env
chmod 600 .env

openssl rand -hex 32   # POSTGRES_PASSWORD
openssl rand -hex 48   # JWT_ACCESS_SECRET
openssl rand -hex 48   # JWT_REFRESH_SECRET
openssl rand -hex 12   # ADMIN_PASSWORD

nano .env
```

**A senha do Postgres aparece duas vezes**: em `POSTGRES_PASSWORD` e dentro do
`DATABASE_URL`. Elas tem de ser iguais, ou a API sobe e nao conecta (erro `P1001`
no log, container reiniciando em laco).

Confira que nao sobrou nenhum modelo:

```bash
grep -c TROQUE-ME .env      # tem de ser 0
```

---

## 9. Primeira subida

```bash
bash scripts/deploy.sh
```

Ele constroi as imagens, publica no Docker Hub, envia o `docker-compose.prod.yml`
(gravado la como `docker-compose.yml`), o `Caddyfile` e o
`docker-compose.caddy.yml`, e sobe. As migracoes sao aplicadas sozinhas no start
pelo entrypoint.

Numa base vazia, crie o administrador **uma vez**:

```bash
ssh -i ~/.ssh/meuapp-ec2.pem ubuntu@<IP>
cd ~/meuapp
IMAGE_TAG=sha-xxxxxxx RUN_SEED=true docker compose up -d --force-recreate api
docker compose logs api | grep entrypoint     # tem de dizer "seed concluido"
IMAGE_TAG=sha-xxxxxxx docker compose up -d --force-recreate api   # desliga o RUN_SEED
```

Confirme que o usuario existe antes de tentar logar:

```bash
docker compose exec -T postgres psql -U meuapp -d meuappdb -tAc 'select email, role from "User";'
```

Abra `http://<IP>`. Depois do primeiro login, **troque a senha do admin pelo
painel**.

---

## 10. Dominio e HTTPS

O certificado e emitido e renovado sozinho pelo Caddy de borda. O painel nunca
sabe o dominio: ele chama `/api` relativo, entao trocar de dominio nao exige
rebuild de imagem nenhuma.

**Pre-requisitos, nesta ordem:**

1. IP elastico **associado** a instancia.
2. Registro DNS `A` de `<DOMINIO>` apontando para esse IP. Confirme com
   `dig +short <DOMINIO>` antes de continuar.
3. Portas 80 e 443 abertas no security group.

Depois, no `.env` da instancia:

```ini
APP_DOMAIN=<DOMINIO>
WEB_PORT=8090
```

`WEB_PORT=8090` libera a 80 para a borda. E suba a borda, **com projeto proprio**:

```bash
cd ~/meuapp
docker compose up -d --force-recreate web                       # move o painel para 8090
docker compose -p caddy -f docker-compose.caddy.yml up -d       # borda na 80/443
docker logs meuapp-caddy | grep "certificate obtained"
```

O `-p caddy` importa: e o nome do projeto que da nome ao volume dos certificados
(`caddy_caddy_data`). Subir sem ele criaria volume novo e o Caddy pediria
certificado do zero, esbarrando no limite do Let's Encrypt (5 por semana por
dominio — de onde nao se sai com pressa).

**Para voltar ao acesso por IP**: `APP_DOMAIN=` vazio e `WEB_PORT=80`, derrube a
borda (`docker compose -p caddy -f docker-compose.caddy.yml down`) e recrie o web.

A partir daqui, `bash scripts/deploy.sh` **nao toca na borda** — e por isso que o
TLS continua de pe durante a troca de versao.

---

## 11. Entrega automatica com GitHub Actions

### 11.1 Secrets

**Settings > Secrets and variables > Actions > Secrets > New repository secret**:

| Secret | Valor |
|---|---|
| `DOCKERHUB_USERNAME` | usuario que publica as imagens |
| `DOCKERHUB_TOKEN` | Access Token do Docker Hub com permissao **Read & Write** nos dois repositorios |
| `EC2_SSH_KEY` | conteudo completo da chave privada PEM, incluindo as linhas BEGIN/END; sem passphrase |
| `EC2_KNOWN_HOSTS` | entrada de `known_hosts` com a chave publica SSH **ja verificada** da instancia |

Para obter `EC2_KNOWN_HOSTS`, na maquina de onde voce ja acessa a instancia:

```bash
ssh-keygen -F <IP> -f ~/.ssh/known_hosts | sed '/^#/d'
```

Se nao houver entrada confiavel, pegue a chave publica pelo console da instancia
(`cat /etc/ssh/ssh_host_ed25519_key.pub`) e monte a linha
`<IP> ssh-ed25519 <chave-publica>`.

> A chave publica do **servidor** e diferente da chave usada para autenticar o
> **usuario**. Confundir as duas e o erro mais comum aqui. O CI exige essa
> identidade fixada de proposito: nao faz `ssh-keyscan` nem aceita uma chave
> desconhecida automaticamente, porque isso anularia a protecao contra alguem se
> passar pelo servidor.

### 11.2 Variables (opcionais)

Na aba **Variables**, se voce nao quiser os padroes escritos no YAML:

| Variavel | Exemplo |
|---|---|
| `DOCKER_NAMESPACE` | `<DOCKERHUB_USER>` |
| `EC2_HOST` | `<IP>` |
| `EC2_USER` | `ubuntu` |
| `EC2_DIR` | `/home/ubuntu/meuapp` |

Se mudar o usuario, ajuste tambem `EC2_DIR`. Se mudar o host, atualize
`EC2_KNOWN_HOSTS` para o mesmo IP/nome.

### 11.3 `.github/workflows/deploy.yml`

```yaml
name: Build e deploy no EC2

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

# Uma entrega termina antes da proxima comecar, inclusive durante o build.
# Um novo push pode substituir uma execucao pendente, mas nao interrompe o SSH.
concurrency:
  group: meuapp-production
  cancel-in-progress: false

jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    timeout-minutes: 45
    defaults:
      run:
        shell: bash
    env:
      DOCKER_NAMESPACE: ${{ vars.DOCKER_NAMESPACE || '<DOCKERHUB_USER>' }}
      EC2_HOST: ${{ vars.EC2_HOST || '<IP>' }}
      EC2_USER: ${{ vars.EC2_USER || 'ubuntu' }}
      EC2_DIR: ${{ vars.EC2_DIR || '/home/ubuntu/meuapp' }}

    steps:
      - name: Baixar o commit do push
        uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Conferir configuracao antes do build
        env:
          DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
          DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
          EC2_SSH_KEY: ${{ secrets.EC2_SSH_KEY }}
          EC2_KNOWN_HOSTS: ${{ secrets.EC2_KNOWN_HOSTS }}
        run: |
          for name in DOCKERHUB_USERNAME DOCKERHUB_TOKEN EC2_SSH_KEY EC2_KNOWN_HOSTS; do
            if [[ -z "${!name}" ]]; then
              echo "::error::Configure o secret $name em Settings > Secrets and variables > Actions."
              exit 1
            fi
          done
          for file in scripts/deploy.sh scripts/lib/image-tag.sh scripts/lib/ssh-key.sh scripts/lib/remote-deploy.sh; do
            bash -n "$file"
          done

      - name: Identificar as imagens pelo commit
        id: images
        run: |
          source scripts/lib/image-tag.sh
          exigir_arvore_limpa
          tag="$(tag_da_imagem)"
          echo "tag=$tag" >> "$GITHUB_OUTPUT"
          for service in api web; do
            {
              echo "${service}_tags<<TAGS"
              echo "$DOCKER_NAMESPACE/meuapp-$service:$tag"
              echo "$DOCKER_NAMESPACE/meuapp-$service:latest"
              echo TAGS
            } >> "$GITHUB_OUTPUT"
          done

      - name: Configurar Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Autenticar no Docker Hub
        uses: docker/login-action@v4
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Construir e publicar API
        uses: docker/build-push-action@v7
        with:
          context: .
          file: apps/api/Dockerfile
          platforms: linux/amd64
          push: true
          tags: ${{ steps.images.outputs.api_tags }}
          cache-from: type=gha,scope=meuapp-api
          cache-to: type=gha,mode=max,scope=meuapp-api

      - name: Construir e publicar painel
        uses: docker/build-push-action@v7
        with:
          context: .
          file: apps/web/Dockerfile
          platforms: linux/amd64
          push: true
          build-args: VITE_API_URL=/api
          tags: ${{ steps.images.outputs.web_tags }}
          cache-from: type=gha,scope=meuapp-web
          cache-to: type=gha,mode=max,scope=meuapp-web

      - name: Atualizar EC2 e verificar saude
        timeout-minutes: 10
        env:
          IMAGE_TAG: ${{ steps.images.outputs.tag }}
          EC2_SSH_KEY: ${{ secrets.EC2_SSH_KEY }}
          EC2_KNOWN_HOSTS: ${{ secrets.EC2_KNOWN_HOSTS }}
          GH_TOKEN: ${{ github.token }}
        run: |
          # Reexecutar um workflow antigo nao deve reverter a main em producao.
          current_sha="$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')"
          if [[ "$current_sha" != "$GITHUB_SHA" ]]; then
            echo 'Deploy ignorado: a main ja tem um commit mais recente.' | tee -a "$GITHUB_STEP_SUMMARY"
            exit 0
          fi

          umask 077
          ssh_dir="$(mktemp -d "$RUNNER_TEMP/meuapp-ssh.XXXXXX")"
          export SSH_KEY="$ssh_dir/key"
          export SSH_KNOWN_HOSTS="$ssh_dir/known_hosts"
          trap 'rm -f -- "$SSH_KEY" "$SSH_KNOWN_HOSTS"; rmdir -- "$ssh_dir"' EXIT
          printf '%s\n' "$EC2_SSH_KEY" | tr -d '\r' > "$SSH_KEY"
          printf '%s\n' "$EC2_KNOWN_HOSTS" | tr -d '\r' > "$SSH_KNOWN_HOSTS"
          unset EC2_SSH_KEY EC2_KNOWN_HOSTS GH_TOKEN

          bash scripts/deploy.sh "$IMAGE_TAG"
          {
            echo "Deploy concluido: $IMAGE_TAG"
            echo "- EC2: $EC2_HOST"
          } >> "$GITHUB_STEP_SUMMARY"
```

Quatro detalhes desse YAML que valem copiar sem mexer:

- **`concurrency` com `cancel-in-progress: false`.** Cancelar um deploy no meio
  do SSH deixa a instancia num estado que ninguem descreveu.
- **A checagem de `current_sha`.** Sem ela, apertar "Re-run" num workflow antigo
  reverte producao para aquele commit, em silencio.
- **`tr -d '\r'` ao escrever a chave.** Um `\r` vindo do secret quebra o PEM com
  erro ilegivel.
- **`cache-from`/`cache-to` com `scope` diferente por imagem.** Sem o scope
  separado, as duas imagens brigam pelo mesmo cache e ele nunca acerta.

### 11.4 O fluxo, uma vez configurado

1. Push na `main` (ou merge de PR) dispara o workflow.
2. Constroi API e painel com cache e publica ambas com a mesma tag `sha-<commit>`.
3. Confere se o commit ainda e o mais recente da `main`.
4. Conecta por SSH, envia os arquivos de composicao, puxa e sobe a tag publicada.
5. Aguarda os healthchecks e so entao atualiza `~/meuapp/.deployed-tag`.

Se build ou publicacao falhar, o passo de deploy nao executa. Se os healthchecks
falharem, o workflow falha e preserva a ultima tag confirmada em `.deployed-tag`
— mas os containers podem ja ter sido atualizados. **Nao ha rollback automatico**;
veja a proxima secao.

Evite rodar o script manual enquanto o workflow estiver entregando: a fila do
GitHub coordena somente execucoes do proprio workflow.

---

## 12. Rollback

Cada entrega tem uma tag propria, entao voltar nao exige rebuild:

```bash
bash scripts/deploy.sh sha-9f3e001
```

Com argumento, o script **nao builda** — buildaria o codigo de agora por cima da
tag pedida, que e o oposto de voltar. Ele so puxa aquela imagem e sobe.

A tag anterior sai do proprio script (ele imprime "no ar hoje"), do
`.deployed-tag` da instancia, ou da lista de tags no Docker Hub:

```bash
ssh -i ~/.ssh/meuapp-ec2.pem ubuntu@<IP> 'cat ~/meuapp/.deployed-tag'
```

Direto na instancia, se a sua maquina nao estiver disponivel:

```bash
cd ~/meuapp
IMAGE_TAG=sha-9f3e001 docker compose pull && \
  IMAGE_TAG=sha-9f3e001 docker compose up -d --wait --wait-timeout 180 && \
  echo sha-9f3e001 > .deployed-tag
```

> **Nunca `docker compose up -d` sem `IMAGE_TAG` ali.** Sem a variavel o compose
> cai no `:latest`, que **na instancia** e o ultimo `pull` sem tag feito naquela
> maquina — pode ser mais velho do que o que esta rodando, e reverte producao sem
> nenhum aviso. Esse e o motivo de todo o cuidado com tags neste guia.

**Rollback de imagem nao desfaz migracao de banco.** Se a versao nova aplicou uma
migracao destrutiva, voltar a imagem nao traz o dado de volta — para isso e o
backup.

---

## 13. Backup e endurecimento

### 13.1 `scripts/ec2-hardening.sh`

```bash
#!/usr/bin/env bash
# Endurece a instancia e liga o backup diario do banco. Idempotente.
#
# O que ele NAO faz, de proposito: mexer no sshd_config. A AMI ja vem com
# autenticacao por senha desligada e root sem senha, que e o que de fato protege
# o SSH. Trocar configuracao de sshd remotamente e a forma classica de se trancar
# para fora.
set -euo pipefail

cd "$(dirname "$0")/.."

EC2_HOST="${EC2_HOST:-<IP>}"
EC2_USER="${EC2_USER:-ubuntu}"
DIAS_RETENCAO="${DIAS_RETENCAO:-14}"

. scripts/lib/ssh-key.sh
KEY="$(ensure_ssh_key)"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new)
REMOTE="$EC2_USER@$EC2_HOST"

ssh "${SSH_OPTS[@]}" "$REMOTE" "DIAS_RETENCAO=$DIAS_RETENCAO bash -s" <<'REMOTO'
set -euo pipefail
DIAS="${DIAS_RETENCAO:-14}"

# fail2ban: com autenticacao por senha desligada, nenhum bot entraria de
# qualquer forma. O ganho e outro: parar de gastar CPU e log com a varredura
# constante, numa instancia pequena onde isso pesa.
if ! command -v fail2ban-server >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban >/dev/null
fi

# jail.local, e nao jail.conf: o .conf e sobrescrito a cada atualizacao do pacote.
sudo tee /etc/fail2ban/jail.local >/dev/null <<'JAIL'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
# backend systemd: nesta distro o log do sshd vai para o journal, nao para
# /var/log/auth.log — com o backend padrao o jail nao encontraria nada e ficaria
# ativo sem nunca banir ninguem.
backend  = systemd

[sshd]
enabled = true
JAIL

sudo systemctl enable fail2ban >/dev/null 2>&1
sudo systemctl restart fail2ban

# Backup diario. Protege contra erro humano, corrupcao e migracao ruim — mas NAO
# contra perder a instancia, porque mora no mesmo disco.
mkdir -p "$HOME/meuapp/backups"

sudo tee /usr/local/bin/meuapp-backup >/dev/null <<BACKUP
#!/bin/bash
set -euo pipefail
cd /home/ubuntu/meuapp
DESTINO="/home/ubuntu/meuapp/backups"
ARQUIVO="\$DESTINO/meuapp-\$(date +%F-%H%M).sql.gz"

# --clean --if-exists deixa o dump restauravel sobre uma base existente sem
# precisar derruba-la antes.
docker compose exec -T postgres pg_dump -U meuapp --clean --if-exists meuappdb \
  | gzip > "\$ARQUIVO"

# Um dump vazio ou truncado e pior que nenhum: passa a falsa sensacao de estar
# protegido. Menos de 1 KB comprimido nao e um banco com dados.
TAMANHO=\$(stat -c%s "\$ARQUIVO")
if [ "\$TAMANHO" -lt 1024 ]; then
  echo "[backup] ERRO: dump de \$TAMANHO bytes, suspeito. Mantido: \$ARQUIVO" >&2
  exit 1
fi

find "\$DESTINO" -name 'meuapp-*.sql.gz' -mtime +$DIAS -delete
echo "[backup] \$ARQUIVO (\$TAMANHO bytes)"
BACKUP
sudo chmod +x /usr/local/bin/meuapp-backup

if ! command -v crontab >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq cron >/dev/null
  sudo systemctl enable --now cron >/dev/null 2>&1 || true
fi

# Cron do usuario, para o docker rodar sem sudo. 03:17 e nao 03:00 de proposito:
# horario redondo e quando todo mundo agenda tarefa pesada.
#
# O "|| true" no grep nao e enfeite: sem crontab previo, o grep recebe entrada
# vazia, nao casa nada e sai com 1 — o que sob "set -e" mata o script bem aqui,
# deixando o backup instalado mas nunca agendado.
CRON_LINHA="17 3 * * * /usr/local/bin/meuapp-backup >> /home/ubuntu/meuapp/backups/backup.log 2>&1"
{ crontab -l 2>/dev/null | grep -v 'meuapp-backup' || true ; echo "$CRON_LINHA" ; } | crontab -

echo "[hardening] rodando o primeiro backup agora, para provar que funciona"
/usr/local/bin/meuapp-backup

echo "  fail2ban: $(sudo systemctl is-active fail2ban)"
df -h / | tail -1 | awk '{print "  disco: "$3" usados de "$2" ("$5")"}'
REMOTO
```

### 13.2 Tirar as copias de la

O backup na instancia nao protege contra **perder a instancia**: ele mora no
mesmo EBS. `scripts/fetch-backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

EC2_HOST="${EC2_HOST:-<IP>}"
EC2_USER="${EC2_USER:-ubuntu}"
REMOTO_DIR="${REMOTO_DIR:-/home/$EC2_USER/meuapp/backups}"
# Fora do repositorio de proposito: dump de banco nao entra em git.
DESTINO="${DESTINO:-$HOME/meuapp-backups}"

. scripts/lib/ssh-key.sh
KEY="$(ensure_ssh_key)"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new)
REMOTE="$EC2_USER@$EC2_HOST"

mkdir -p "$DESTINO"

if [ "${1:-}" = "--todos" ]; then
  scp "${SSH_OPTS[@]}" "$REMOTE:$REMOTO_DIR/meuapp-*.sql.gz" "$DESTINO/"
else
  ULTIMO=$(ssh "${SSH_OPTS[@]}" "$REMOTE" "ls -1t $REMOTO_DIR/meuapp-*.sql.gz 2>/dev/null | head -1")
  if [ -z "$ULTIMO" ]; then
    echo "erro: nenhum backup encontrado em $REMOTO_DIR" >&2
    exit 1
  fi
  scp "${SSH_OPTS[@]}" "$REMOTE:$ULTIMO" "$DESTINO/"
fi

ls -lh "$DESTINO"/*.sql.gz
```

### 13.3 Restaurar

```bash
scp -i ~/.ssh/meuapp-ec2.pem <arquivo> ubuntu@<IP>:/tmp/
ssh -i ~/.ssh/meuapp-ec2.pem ubuntu@<IP> \
  "cd ~/meuapp && gunzip -c /tmp/<arquivo> | docker compose exec -T postgres psql -U meuapp -d meuappdb"
```

**Isto sobrescreve o banco atual.** Vale ligar tambem snapshots do EBS pelo
console da AWS: eles pegam o disco inteiro, nao so o banco.

---

## 14. IAM Role e S3

Se a aplicacao guarda arquivos (upload de foto, anexos), use **IAM Role**, nao
chave de acesso. Chave no `.env` seria um segredo a mais para vazar e rotacionar,
com o mesmo resultado.

1. IAM > Roles > Create role > AWS service > EC2.
2. Politica minima:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::meu-bucket/uploads/*"
}
```

3. EC2 > instancia > Actions > Security > **Modify IAM role** > anexar.
4. No `.env` vai so `AWS_REGION` e `AWS_S3_BUCKET`. Se `AWS_ACCESS_KEY_ID`
   aparecer la, apague.

Mantenha o bucket **privado**. A API assina URLs de curta duracao (15 min) para
exibir os arquivos, e nenhuma credencial chega ao bundle do painel.

### A armadilha do Docker aqui

O SDK le a Role no servico de metadados (`169.254.169.254`), e de dentro de um
container isso conta como **dois saltos** — host, depois container. O padrao do
IMDSv2 e um salto so, entao o pacote e descartado e o upload responde `503` com
"credenciais nao resolvidas" no log, **mesmo com a Role certa anexada**. Pior:
`aws s3api` rodado direto na instancia funciona e esconde o problema, porque esse
nao passa por container nenhum.

Uma vez por instancia, do seu terminal:

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-XXXXXXXX \
  --http-tokens required \
  --http-put-response-hop-limit 2
```

Para conferir **de dentro do container**, que e o que importa:

```bash
docker compose exec api node -e "require('@aws-sdk/credential-providers').fromNodeProviderChain()().then(c => console.log('ok', c.accessKeyId))"
```

---

## 15. Diagnostico

```bash
docker compose ps                     # quem esta de pe, e com qual imagem
docker compose logs -f api            # a API, incluindo as migracoes do start
docker logs -f meuapp-caddy           # a borda, incluindo a emissao do certificado
docker stats                          # memoria e CPU
free -m                               # confirma que o swap esta ativo
df -h /                               # disco; imagens antigas enchem rapido
docker system prune -af --volumes=false   # limpa imagens sem uso (nao toca em volumes)
```

| Sintoma | Causa provavel |
|---|---|
| `pull access denied` ou `manifest unknown` | tag inexistente, ou repositorio privado sem `docker login` na instancia |
| API reinicia em laco, log com `P1001` | Postgres nao subiu, ou a senha do `DATABASE_URL` difere de `POSTGRES_PASSWORD` |
| Painel abre, chamadas para `/api` falham | o proxy nao alcanca a API: `docker compose exec web wget -qO- http://api:3333/health` |
| Toda requisicao vira 502 na borda | a rede `external` do compose da borda nao e a mesma do app; confira `docker network ls` |
| Login diz "credenciais invalidas" numa base nova | o seed nao rodou; veja a secao 9 |
| Certificado nao emite | DNS ainda nao propagou, IP elastico nao associado, ou porta 80/443 fechada |
| Build morre com `killed` / `heap out of memory` | voce esta buildando **na instancia**. Nao faca isso; o modelo inteiro existe para evitar isso |
| Deploy verde, mas a versao nao mudou | subiu sem `IMAGE_TAG` e caiu no `latest` local; veja a secao 12 |
| Porta parece fechada de fora | **meca o tempo**, abaixo |

O ultimo item vale destacar. `nc` e `/dev/tcp` falham igual nos dois casos, e
confundi-los custa tempo procurando no lugar errado:

```bash
time timeout 10 bash -c 'echo > /dev/tcp/<IP>/443'
```

Recusa em menos de 1s = nada escutando na porta (problema seu, no container).
Timeout de 10s = firewall barrando (problema no security group). Sao coisas
diferentes.

---

## 16. Checklist final

**Repositorio**

- [ ] `ssh/` no `.gitignore` **e** no `.dockerignore`
- [ ] `.env*` no `.dockerignore`, com excecao do `.env.example`
- [ ] `apps/api/Dockerfile` e `apps/web/Dockerfile` multi-estagio
- [ ] `VITE_API_URL=/api` (relativo) como build-arg do painel
- [ ] entrypoint da API aplicando `migrate deploy`, commitado com `+x`
- [ ] endpoint `/health` na API, consultando o banco
- [ ] `docker-compose.prod.yml` sem `build:`, sem porta publicada em api/postgres
- [ ] `Caddyfile` + `docker-compose.caddy.yml` com projeto e rede externa
- [ ] `.env.production.example` versionado, `.env` real nunca

**Instancia**

- [ ] IP elastico **associado**
- [ ] security group so com 22, 80 e 443
- [ ] `bash scripts/ec2-bootstrap.sh` rodado (swap + Docker + compose v2)
- [ ] `.env` criado a mao, `chmod 600`, `grep -c TROQUE-ME` = 0
- [ ] senha do Postgres identica em `POSTGRES_PASSWORD` e `DATABASE_URL`
- [ ] `bash scripts/ec2-hardening.sh` rodado (fail2ban + backup diario)
- [ ] hop limit do IMDSv2 em 2, se usa IAM Role

**Entrega**

- [ ] primeira subida por `bash scripts/deploy.sh` funcionando
- [ ] seed rodado uma vez e **senha do admin trocada pelo painel**
- [ ] os 4 secrets do GitHub configurados
- [ ] um push na `main` entregando de ponta a ponta
- [ ] um rollback testado **antes** de precisar dele
- [ ] `bash scripts/fetch-backup.sh` rodado ao menos uma vez
- [ ] snapshots do EBS ligados

---

## Referencia neste repositorio

Os arquivos reais, em producao, para comparar:

| Assunto | Arquivo |
|---|---|
| Operacao do dia a dia | [docs/deploy.md](deploy.md) |
| Imagem da API | [apps/api/Dockerfile](../apps/api/Dockerfile) |
| Migracoes no start | [apps/api/docker-entrypoint.sh](../apps/api/docker-entrypoint.sh) |
| Imagem do painel | [apps/web/Dockerfile](../apps/web/Dockerfile) |
| Caddy interno | [apps/web/Caddyfile](../apps/web/Caddyfile) |
| Composicao de producao | [docker-compose.prod.yml](../docker-compose.prod.yml) |
| Borda TLS | [Caddyfile](../Caddyfile) e [docker-compose.caddy.yml](../docker-compose.caddy.yml) |
| Scripts | [scripts/](../scripts/) |
| CI/CD | [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) |
| Teste do deploy remoto | [scripts/tests/deploy.sh](../scripts/tests/deploy.sh) |
