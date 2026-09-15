#!/usr/bin/env bash
# Test the actual stdin/SSH execution mode with a fake Docker executable.
set -euo pipefail
cd "$(dirname "$0")/../.."
repo_dir="$PWD"
test_root="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/portal-backoffice-deploy.XXXXXX")"
resolved_test_dir="$(cd "$test_dir" && pwd -P)"
# Validate the absolute cleanup target, including when running under Git Bash.
case "$resolved_test_dir" in
  "$test_root"/portal-backoffice-deploy.*) ;;
  *) echo 'erro: diretorio temporario fora do destino esperado.' >&2; exit 1 ;;
esac
trap 'rm -rf -- "$test_dir"' EXIT
mkdir -p "$test_dir/bin" "$test_dir/app"
printf 'TEST=true\n' > "$test_dir/app/.env"
cat > "$test_dir/bin/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$DOCKER_TEST_LOG"
if [[ "$*" == *'exec -T'* ]]; then cat >/dev/null; fi
if [[ -n "${DOCKER_TEST_FAIL:-}" && "$*" == *"$DOCKER_TEST_FAIL"* ]]; then exit 1; fi
MOCK
chmod +x "$test_dir/bin/docker"
export PATH="$test_dir/bin:$PATH" DOCKER_TEST_LOG="$test_dir/docker.log"
printf 'sha-111111111111\n' > "$test_dir/app/.deployed-tag"

bash -s -- "$test_dir/app" sha-222222222222 example 240 < "$repo_dir/scripts/lib/remote-deploy.sh"
[[ "$(cat "$test_dir/app/.deployed-tag")" == sha-222222222222 ]]
[[ "$(cat "$test_dir/app/.previous-tag")" == sha-111111111111 ]]
grep -q 'compose ps' "$DOCKER_TEST_LOG"
grep -q 'caddy reload' "$DOCKER_TEST_LOG"

for fail in 'compose pull' 'up -d --wait --wait-timeout 240' 'exec -T web' 'caddy validate' 'caddy reload'; do
  export DOCKER_TEST_FAIL="$fail"
  if bash -s -- "$test_dir/app" sha-333333333333 example 240 < "$repo_dir/scripts/lib/remote-deploy.sh"; then
    echo "erro: deploy deveria falhar em $fail" >&2
    exit 1
  fi
  [[ "$(cat "$test_dir/app/.deployed-tag")" == sha-222222222222 ]]
done
unset DOCKER_TEST_FAIL
printf 'PASSWORD=TROQUE-ME\n' > "$test_dir/app/.env"
if bash -s -- "$test_dir/app" sha-333333333333 example 240 < "$repo_dir/scripts/lib/remote-deploy.sh"; then
  echo 'erro: aceitou segredo de exemplo' >&2
  exit 1
fi
echo 'OK: deploy por stdin, verificacao da borda e preservacao da ultima tag em falhas.'
