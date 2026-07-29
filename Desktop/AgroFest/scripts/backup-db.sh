#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/agrofest-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
cd "${APP_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

docker compose -f "${COMPOSE_FILE}" exec -T db pg_dump \
  -U "${POSTGRES_USER:-agrofest}" \
  -d "${POSTGRES_DB:-agrofest}" \
  -Fc \
  -f "/tmp/agrofest-${TIMESTAMP}.dump"

docker compose -f "${COMPOSE_FILE}" cp "db:/tmp/agrofest-${TIMESTAMP}.dump" "${BACKUP_FILE}"
docker compose -f "${COMPOSE_FILE}" exec -T db rm -f "/tmp/agrofest-${TIMESTAMP}.dump"

find "${BACKUP_DIR}" -maxdepth 1 -type f -name "agrofest-*.dump" -printf "%T@ %p\n" \
  | sort -rn \
  | awk 'NR>7 {print $2}' \
  | xargs -r rm -f

echo "Backup created: ${BACKUP_FILE}"
