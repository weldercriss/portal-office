#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib/image-tag.sh
validate_namespace
require_clean_tree
tag="$(image_tag)"
platform="${PLATFORM:-linux/amd64}"
[[ "$platform" == linux/amd64 || "$platform" == linux/arm64 ]] || {
  echo 'erro: PLATFORM deve ser linux/amd64 ou linux/arm64.' >&2
  exit 1
}
# docker login must have been performed on this machine beforehand.
docker buildx build --platform "$platform" -f backend/Dockerfile \
  -t "$DOCKER_NAMESPACE/portal-backoffice-backend:$tag" --push .
docker buildx build --platform "$platform" -f frontend/Dockerfile \
  -t "$DOCKER_NAMESPACE/portal-backoffice-web:$tag" --push .
printf 'Imagens publicadas: %s\n' "$tag"
