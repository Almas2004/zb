#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
BRANCH="${BRANCH:-main}"

cd "${APP_DIR}"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  if [[ ! -d .git ]]; then
    echo "${APP_DIR} is not a git repository. Run scripts/setup-vps.sh first."
    exit 1
  fi

  git fetch origin "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
fi

if [[ ! -f .env ]]; then
  echo ".env is missing in ${APP_DIR}. Create it from GitHub Secret APP_ENV or .env.example before deploying."
  exit 1
fi

docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:3000/api/health}"

healthcheck_ok=0
for attempt in {1..30}; do
  if curl --fail --silent --show-error "${HEALTHCHECK_URL}" >/dev/null; then
    healthcheck_ok=1
    break
  fi
  sleep 2
done

if [[ "${healthcheck_ok}" != "1" ]]; then
  docker compose -f docker-compose.prod.yml ps
  docker compose -f docker-compose.prod.yml logs --tail=120
  exit 1
fi

docker compose -f docker-compose.prod.yml ps
docker image prune -f
