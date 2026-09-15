#!/usr/bin/env bash
# Execute on EC2. The deploy copies this beside docker-compose.yml.
set -euo pipefail
cd "$(dirname "$0")"
umask 077
export IMAGE_TAG="${IMAGE_TAG:-$(cat .deployed-tag)}"
mkdir -p backups
backup_dir="$(mktemp -d "backups/$(date -u +%Y%m%dT%H%M%SZ).XXXXXX")"
# pipefail prevents a failed dump from being mistaken for a successful gzip.
docker compose exec -T postgres sh -ec \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  | gzip > "$backup_dir/database.sql.gz"
gzip -t "$backup_dir/database.sql.gz"
docker compose exec -T backend tar -czf - -C /app uploads > "$backup_dir/uploads.tar.gz"
tar -tzf "$backup_dir/uploads.tar.gz" >/dev/null
printf '%s\n' "$IMAGE_TAG" > "$backup_dir/image-tag"
touch "$backup_dir/COMPLETE"
printf 'Backup concluido: %s (copie para fora do EC2).\n' "$backup_dir"
