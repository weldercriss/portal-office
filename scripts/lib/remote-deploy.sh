#!/usr/bin/env bash
set -euo pipefail
cd "$1"
export IMAGE_TAG="$2" DOCKER_NAMESPACE="$3"
deploy_timeout="$4"
umask 077
# Do not source .env as shell code or print interpolated secrets.
if grep -q 'TROQUE-ME' .env; then
  echo 'erro: substitua todos os TROQUE-ME no .env da instancia.' >&2
  exit 1
fi
docker compose config --quiet
docker compose pull
docker compose up -d --wait --wait-timeout "$deploy_timeout"
docker compose exec -T web sh -ec '
  wget -q -T 5 -O /dev/null http://127.0.0.1/
  wget -q -T 5 -O /dev/null http://127.0.0.1/api/health
' </dev/null
# Separate project: normal application updates never stop the TLS edge.
docker compose -f docker-compose.caddy.yml up -d --wait --wait-timeout 60
docker compose -f docker-compose.caddy.yml exec -T caddy \
  caddy validate --config /etc/caddy/Caddyfile </dev/null
docker compose -f docker-compose.caddy.yml exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile </dev/null
docker compose -f docker-compose.caddy.yml exec -T caddy \
  wget -q -T 5 -O /dev/null http://web/api/health </dev/null
docker compose ps
marker="$(mktemp .deployed-tag.XXXXXX)"
trap 'rm -f -- "$marker"' EXIT
printf '%s\n' "$IMAGE_TAG" > "$marker"
if [ -f .deployed-tag ]; then cp .deployed-tag .previous-tag; fi
mv -f -- "$marker" .deployed-tag
trap - EXIT
