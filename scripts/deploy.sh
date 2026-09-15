#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib/image-tag.sh
validate_namespace
if [ "$#" -gt 1 ]; then
  echo 'uso: bash scripts/deploy.sh [sha-<commit>]' >&2
  exit 1
fi
if [ "$#" -eq 1 ]; then
  tag="$1"
  SKIP_BUILD=1
else
  require_clean_tree
  tag="$(image_tag)"
fi
[[ "$tag" =~ $TAG_RE ]] || { echo 'erro: use uma tag sha-<commit>; latest nao e permitido.' >&2; exit 1; }
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-240}"
[[ "$DEPLOY_TIMEOUT" =~ ^[1-9][0-9]{0,3}$ ]] && [ "$DEPLOY_TIMEOUT" -le 3600 ] || {
  echo 'erro: DEPLOY_TIMEOUT deve estar entre 1 e 3600 segundos.' >&2
  exit 1
}
source scripts/lib/ssh.sh
ssh "${SSH_OPTS[@]}" "$REMOTE" "test -f '$EC2_DIR/.env'" || {
  echo "erro: crie $EC2_DIR/.env na instancia conforme docs/deploy.md." >&2
  exit 1
}
if [ "${SKIP_BUILD:-0}" != 1 ]; then
  bash scripts/build-push.sh
fi
previous="$(ssh "${SSH_OPTS[@]}" "$REMOTE" "cat '$EC2_DIR/.deployed-tag' 2>/dev/null || true")"
# Explicit allowlist: never send .env, uploads, private keys or the source tree.
scp "${SSH_OPTS[@]}" docker-compose.prod.yml "$REMOTE:$EC2_DIR/docker-compose.yml"
scp "${SSH_OPTS[@]}" Caddyfile docker-compose.caddy.yml scripts/backup.sh "$REMOTE:$EC2_DIR/"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "bash -s -- '$EC2_DIR' '$tag' '$DOCKER_NAMESPACE' '$DEPLOY_TIMEOUT'" < scripts/lib/remote-deploy.sh
printf 'Deploy concluido: %s. Tag anterior: %s\n' "$tag" "${previous:-nenhuma}"
