#!/bin/sh
set -eu

echo '[entrypoint] Aplicando migracoes...'
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo '[entrypoint] Criando administrador de producao...'
  node dist/prisma/seed-production.js
fi
exec "$@"
