# Production deploy AgroFest 2026

## Stack audit

- Next.js 15 App Router, React 19, TypeScript.
- Backend is inside Next.js route handlers in `src/app/api`.
- PostgreSQL is used through Prisma.
- Existing local Docker setup is kept; production uses `docker-compose.prod.yml`.
- Production path on VPS: `/opt/app`.
- Public entrypoint: host Nginx on ports `80` and later `443`.
- App container is exposed only on `127.0.0.1:3000`; PostgreSQL is not exposed outside Docker.

## Deployment scheme

Internet -> host Nginx -> `127.0.0.1:3000` -> Next.js Docker container -> PostgreSQL Docker container.

This is a single Next.js application, so `/` and `/api/*` go to the same app container.

## Required GitHub Secrets

- `VPS_HOST`: `194.238.43.169`
- `VPS_USER`: `ubuntu`
- `VPS_PORT`: `22`
- `VPS_SSH_KEY`: contents of `C:\Users\anm24\.ssh\agrofest_github_actions`
- `APP_ENV`: full production `.env` content

Never commit `.env`, VPS password, DB password, tokens, or private SSH keys.

## Production APP_ENV template

Generate strong unique values before using this:

```dotenv
POSTGRES_DB="agrofest"
POSTGRES_USER="agrofest"
POSTGRES_PASSWORD="<strong-random-database-password>"
DATABASE_URL="postgresql://agrofest:<strong-random-database-password>@db:5432/agrofest?schema=public"
SESSION_SECRET="<strong-random-64-plus-character-secret>"
APP_URL="http://194.238.43.169"
APP_PORT="3000"
SEED_ADMIN_LOGIN="admin"
SEED_ADMIN_PASSWORD="<strong-temporary-admin-password>"
SEED_SCANNER_PASSWORD="<unused-strong-password>"
CAPTCHA_ENABLED="false"
CAPTCHA_SECRET=""
WHATSAPP_BUSINESS_ENABLED="false"
WHATSAPP_BUSINESS_TOKEN=""
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=""
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX="30"
TZ="Asia/Almaty"
ALLOW_OUTSIDE_EVENT_DATES="false"
TEST_EVENT_DATE="2026-07-31"
```

When a domain is connected, change `APP_URL` to `https://DOMAIN`.

## First VPS setup

```bash
ssh ubuntu@194.238.43.169
sudo mkdir -p /opt/app
sudo chown -R ubuntu:ubuntu /opt/app
git clone https://github.com/OWNER/REPO.git /opt/app
cd /opt/app
REPO_URL="https://github.com/OWNER/REPO.git" sudo -E bash scripts/setup-vps.sh
```

## Add GitHub Actions public key to VPS

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Public key file on this machine:

```text
C:\Users\anm24\.ssh\agrofest_github_actions.pub
```

## Initial production deploy

```bash
cd /opt/app
nano .env
chmod 600 .env
bash scripts/deploy.sh
```

Check:

```bash
curl --fail http://127.0.0.1/health
curl --fail http://194.238.43.169/health
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=120 app
```

## GitHub Actions deploy

After `VPS_SSH_KEY` and `APP_ENV` are added, every push to `main` runs CI, then SSH deployment. The workflow writes `.env` from `APP_ENV`, runs `prisma migrate deploy`, restarts containers, checks `/health`, shows compose status, and prunes only unused images.

## Manual restart and logs

```bash
cd /opt/app
docker compose -f docker-compose.prod.yml restart app
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml ps
```

## Rollback

```bash
cd /opt/app
git fetch origin
git checkout <GOOD_COMMIT_SHA>
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
curl --fail --retry 10 --retry-delay 5 http://127.0.0.1/health
```

Do not run `docker compose down -v` in production.

## Domain and SSL

Point DNS `A` record to `194.238.43.169`.

```bash
sudo certbot --nginx -d DOMAIN -d www.DOMAIN
sudo nginx -t
sudo systemctl reload nginx
```

Then update `APP_URL` in `APP_ENV` and `/opt/app/.env` to `https://DOMAIN`, redeploy, and verify:

```bash
curl -I https://DOMAIN/health
```

## Backups

```bash
cd /opt/app
bash scripts/backup-db.sh
```

Backups are written to `/opt/backups` as compressed custom-format PostgreSQL dumps. The script keeps the latest 7 `agrofest-*.dump` files and does not delete other files.

Daily cron example:

```cron
15 2 * * * cd /opt/app && /usr/bin/bash scripts/backup-db.sh >> /opt/backups/backup.log 2>&1
```

Restore example to an empty database:

```bash
cd /opt/app
docker compose -f docker-compose.prod.yml cp /opt/backups/agrofest-YYYYMMDD-HHMMSS.dump db:/tmp/restore.dump
docker compose -f docker-compose.prod.yml exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /tmp/restore.dump
```
