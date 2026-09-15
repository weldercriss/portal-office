# Sourced by build and deploy scripts.
TAG_RE='^sha-[0-9a-f]{7,40}$'

image_tag() {
  local sha
  sha="$(git rev-parse --short=12 HEAD)" || return 1
  printf 'sha-%s\n' "$sha"
}

require_clean_tree() {
  local changes
  changes="$(git status --porcelain)" || return 1
  if [ -n "$changes" ]; then
    echo 'erro: commite as alteracoes antes de publicar uma imagem identificada pelo commit.' >&2
    return 1
  fi
}

validate_namespace() {
  [[ "${DOCKER_NAMESPACE:-}" =~ ^[a-z0-9]+([._-][a-z0-9]+)*$ ]] || {
    echo 'erro: defina DOCKER_NAMESPACE com seu usuario/organizacao no Docker Hub.' >&2
    return 1
  }
}
