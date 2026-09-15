# Banco de dados local

Definido em `backend/docker-compose.yml`:

- Serviço `postgres`, imagem `postgres:16-alpine`.
- Porta publicada no host: `5433` (mapeada para `5432` do container) — não
  `5432`, para não colidir com um Postgres já instalado na máquina.
- Usuário, senha e banco: `portal_backoffice`.
- Volume nomeado `postgres_data` para persistência entre reinícios.

`backend/.env.example` já aponta `DATABASE_URL` para essas credenciais em
`localhost:5433`. Subir com `docker compose up -d` dentro de `backend/`.

Para inspecionar dados manualmente, conecte um client (psql, TablePlus etc.)
em `localhost:5433` com essas credenciais — nunca edite dados de tabela
diretamente como forma de corrigir um bug; corrija via código/migration e,
se for só dado de desenvolvimento, recrie o volume.

## Checklist

- [ ] Ambiente local aponta para a porta `5433`, não `5432`?
- [ ] Nenhuma correção de dado foi feita por edição manual direta no banco em
      vez de código/migration?
