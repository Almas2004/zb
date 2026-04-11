# Production deployment

## What this setup includes

- `docker-compose.prod.yml` for PostgreSQL, backend, and nginx
- `server/Dockerfile` with LibreOffice for PDF generation on Ubuntu
- `client/Dockerfile` that builds the React app and serves it through nginx
- GitHub Actions workflow for auto-deploy to VPS

## Required GitHub Secrets

Create these repository secrets before enabling auto-deploy:

- `VPS_HOST`
- `VPS_PORT` (usually `22`)
- `VPS_USERNAME`
- `VPS_PASSWORD`
- `APP_DIR` (recommended: `/opt/abzal-crm`)
- `DEPLOY_ROOT_ENV`
- `DEPLOY_SERVER_ENV`

## Secret: `DEPLOY_ROOT_ENV`

Use the contents of `.env.prod.example`, for example:

```env
POSTGRES_DB=abzal_crm
POSTGRES_USER=abzal
POSTGRES_PASSWORD=change_me_db_password
```

## Secret: `DEPLOY_SERVER_ENV`

Use the contents of `server/.env.production.example`, for example:

```env
PORT=4000
DATABASE_URL=postgres://abzal:change_me_db_password@postgres:5432/abzal_crm
JWT_SECRET=change_me_strong_jwt_secret
APP_URL=https://crm.example.com
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_WEBHOOK_SECRET=change_me_telegram_secret
NOTIFICATION_CRON=0 9 * * *
DOCUMENT_TEMPLATES_DIR=/app/server/templates
```

## One-time VPS preparation

Run once on the server:

```bash
chmod +x deploy/bootstrap-vps.sh
./deploy/bootstrap-vps.sh
```

Or install Docker manually if you already have a preferred setup.

## Document templates

Upload these files to `server/templates/` on the VPS:

- `Запрос в суд на предоставления доступа к документам по процессу.docx`
- `Запрос в гос органы (30.03.2026).docx`
- `Запрос в БВУ РК и другие фин.оргн..docx`
- `Письмо в ДГД на подачу объявления каз и рус языках.docx`
- `Запрос документов от должника.docx`

Without them, document generation will not work in production.

## Recommended DNS records

If the domain is `crm.example.com`, add:

- `A` record: `crm` -> `185.4.180.19`
- `AAAA` record: `crm` -> `2a00:5da0:1000:1::2c86`

If you want the root domain instead of a subdomain, point `@` to the same values.

## SSL

Telegram webhook requires HTTPS. After the domain points to the server, issue an SSL certificate.

The simplest production path is:

1. point DNS to the VPS
2. run the stack
3. add SSL with certbot or place the app behind Cloudflare / another reverse proxy
4. register Telegram webhook using the HTTPS domain

## Deploy flow

Every push to `main` will:

1. build and validate the project in GitHub Actions
2. upload the repository to the VPS
3. write `.env` files from GitHub Secrets
4. build and restart the production containers
5. run `node src/scripts/initDb.js` inside the backend container
