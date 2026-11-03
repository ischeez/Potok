#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${SCRIPT_DIR}/compose.production.yaml}"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/potok}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/potok-${TIMESTAMP}.sql.gz"
TEMP_FILE="${BACKUP_FILE}.partial"

if [[ ! -f "${ENV_FILE}" ]]; then
  printf 'Missing production environment file: %s\n' "${ENV_FILE}" >&2
  exit 1
fi

install -d -m 0700 "${BACKUP_DIR}"
trap 'rm -f -- "${TEMP_FILE}"' EXIT

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
  sh -c 'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  | gzip -9 > "${TEMP_FILE}"

mv -- "${TEMP_FILE}" "${BACKUP_FILE}"
trap - EXIT

# Retention applies only to backups created by this script.
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'potok-*.sql.gz' -mtime +7 -delete

printf 'Backup created: %s\n' "${BACKUP_FILE}"

