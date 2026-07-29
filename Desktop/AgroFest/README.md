# AgroFest 2026 QR Registration

Production-ready Next.js система регистрации гостей, выпуска персональных QR-билетов, контроля прохода, администрирования и Excel-экспорта для AgroFest 2026.

## Стек

Next.js App Router, TypeScript, React, Tailwind CSS, Prisma ORM, PostgreSQL, Zod, React Hook Form, HTTP-only JWT cookies, bcrypt, QR generation, html5-qrcode, IndexedDB offline queue, XLSX export, Vitest, Docker.

## Архитектура

- `src/app` - страницы и route handlers.
- `src/components` - UI, форма регистрации, билет, сканер, админка.
- `src/lib` - доменная логика, Prisma, auth, validation, crypto, i18n, offline queue.
- `prisma/schema.prisma` - модель данных и ограничения.
- `prisma/seed.ts` - dev seed.
- `docs/STAFF_INSTRUCTION_RU.md` - инструкция для сотрудников.

QR-код содержит только непрогнозируемый токен или ссылку `/check-in/TOKEN`. Персональные данные в QR не записываются.

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

- `DATABASE_URL` - PostgreSQL connection string.
- `SESSION_SECRET` - случайный секрет минимум 32 байта.
- `APP_URL` - публичный HTTPS URL.
- `SEED_ADMIN_LOGIN`, `SEED_ADMIN_PASSWORD`, `SEED_SCANNER_PASSWORD` - только для dev seed.
- `CAPTCHA_ENABLED`, `CAPTCHA_SECRET` - резерв для CAPTCHA.
- `WHATSAPP_BUSINESS_ENABLED`, `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_BUSINESS_PHONE_NUMBER_ID` - резерв для WhatsApp Business API.

## Локальный запуск

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Откройте:

- регистрация: `http://localhost:3000/`
- вход: `http://localhost:3000/login`
- админка: `http://localhost:3000/admin`
- сканер: `http://localhost:3000/scanner`

Dev seed выводит QR-токены тестовых гостей в консоль.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npm run db:seed
```

Контейнер приложения перед стартом выполняет `npx prisma migrate deploy`. Для production seed не запускайте с тестовыми паролями. Создайте администратора отдельной командой или временно задайте сильные seed-пароли.

## HTTPS и домен

На VPS направьте домен на сервер, установите Nginx и Certbot, получите сертификат Let's Encrypt. Пример reverse proxy находится в `nginx.example.conf`. В production камера на iPhone/Android стабильно работает только через HTTPS.

## Роли

- `ADMIN` - статистика, гости, экспорт, пользователи, настройки, audit log.
- `SCANNER` - сканер, ручная проверка, offline queue.

## Offline-режим

Сканер является PWA и кеширует интерфейс. При отсутствии связи операция сохраняется в IndexedDB и получает жёлтый статус. Система намеренно не показывает зелёный статус без подтверждения сервера, потому что шесть полностью офлайн-устройств не могут гарантированно исключить двойной проход.

## WhatsApp

Базовый режим открывает WhatsApp с заранее подготовленным текстом и ссылкой на билет. Обычная ссылка WhatsApp не умеет автоматически прикреплять изображение билета. Для автоматической отправки сообщений нужен официальный WhatsApp Business API; для него предусмотрены переменные окружения и место подключения адаптера.

## Excel

Экспорт доступен в `/admin/export` и отдаёт `.xlsx` с регистрационным номером, ФИО, телефоном, категорией, выбранными днями, статусом, проходами по датам, источником и комментарием.

## Резервное копирование PostgreSQL

```bash
npm run db:backup
BACKUP_FILE=backups/agrofest-....sql npm run db:restore
```

Перед мероприятием сделайте backup и проверьте восстановление на отдельной базе. Во время мероприятия храните копии вне VPS и делайте backup каждые 1-2 часа.

## Preflight

```bash
npm run preflight
```

Команда проверяет `.env`, PostgreSQL, миграции, администратора, даты, `Asia/Almaty`, тестовую запись, QR, Excel, место на диске и production build.

## Нагрузочная проверка

```bash
npm run generate:guests -- 10000
npm run build
npm run start
npm run test:load
```

`test:load` использует production URL из `LOAD_TEST_URL` или `APP_URL` и выводит количество запросов, успешные ответы, ошибки, average, p95 и p99.

## Ubuntu VPS Production

1. Установите Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nginx certbot python3-certbot-nginx
```

2. Скопируйте проект:

```bash
git clone <REPO_URL> /opt/agrofest
cd /opt/agrofest
cp .env.example .env
nano .env
```

3. В `.env` задайте production-значения:

```bash
DATABASE_URL=postgresql://agrofest:STRONG_PASSWORD@db:5432/agrofest?schema=public
SESSION_SECRET=<random-64-chars>
APP_URL=https://DOMAIN
TZ=Asia/Almaty
```

4. Запустите:

```bash
docker compose up -d --build
docker compose logs -f app
docker compose exec app npx prisma migrate deploy
```

5. Настройте Nginx и SSL:

```bash
sudo cp nginx.example.conf /etc/nginx/sites-available/agrofest
sudo sed -i 's/example.kz/DOMAIN/g' /etc/nginx/sites-available/agrofest
sudo ln -s /etc/nginx/sites-available/agrofest /etc/nginx/sites-enabled/agrofest
sudo nginx -t
sudo certbot --nginx -d DOMAIN
sudo systemctl reload nginx
```

6. Проверка:

```bash
curl -I https://DOMAIN/
docker compose exec app npm run preflight
```

Адреса: регистрация `https://DOMAIN/`, вход `https://DOMAIN/login`, сканер `https://DOMAIN/scanner`, админка `https://DOMAIN/admin`.

7. Обновление без удаления базы:

```bash
cd /opt/agrofest
git pull
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

8. Логи и перезапуск:

```bash
docker compose logs -f app
docker compose restart app
```

## Проверка

```bash
npm run prisma:generate
npm run typecheck
npm run test
npm run build
```

## Production deploy

Актуальная инструкция для VPS, Docker Compose, Nginx, GitHub Actions, SSL и backup находится в `docs/PRODUCTION_DEPLOY_RU.md`.

Перед мероприятием проверьте HTTPS, домен, seed/пароли, 6 устройств сканеров, доступ к камере, резервный интернет, тестовый повторный проход, Excel-экспорт и инструктаж сотрудников.
