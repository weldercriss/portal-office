# Sourced after changing to the repository root. No secrets are printed.
EC2_USER="${EC2_USER:-ubuntu}"
EC2_DIR="${EC2_DIR:-/home/$EC2_USER/portal-backoffice}"
if [[ ! "${EC2_HOST:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] ||
   [[ ! "$EC2_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] ||
   [[ ! "$EC2_DIR" =~ ^/[a-zA-Z0-9_/-][a-zA-Z0-9_./-]*$ ]] ||
   [[ "$EC2_DIR" == *'/../'* || "$EC2_DIR" == */.. ]]; then
  echo 'erro: configure EC2_HOST, EC2_USER e EC2_DIR (caminho absoluto sem espacos).' >&2
  exit 1
fi

if [ -z "${SSH_KEY:-}" ]; then
  : "${SSH_KEY_SOURCE:?Defina SSH_KEY ou SSH_KEY_SOURCE com o caminho do PEM}"
  SSH_KEY="$HOME/.ssh/portal-backoffice-ec2.pem"
  mkdir -p "$(dirname "$SSH_KEY")"
  if ! cmp -s "$SSH_KEY_SOURCE" "$SSH_KEY"; then
    install -m 400 "$SSH_KEY_SOURCE" "$SSH_KEY"
  fi
fi
test -r "$SSH_KEY"
chmod 400 "$SSH_KEY"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3)
if [ -n "${SSH_KNOWN_HOSTS:-}" ]; then
  test -s "$SSH_KNOWN_HOSTS"
  SSH_OPTS+=(-o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$SSH_KNOWN_HOSTS")
elif [ "${CI:-}" = true ] || [ "${GITHUB_ACTIONS:-}" = true ]; then
  echo 'erro: SSH_KNOWN_HOSTS verificado e obrigatorio no CI.' >&2
  exit 1
else
  SSH_OPTS+=(-o StrictHostKeyChecking=accept-new)
fi
REMOTE="$EC2_USER@$EC2_HOST"
