import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://abzal:abzal_password@localhost:5432/abzal_crm',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || 'dev_telegram_secret',
  notificationCron: process.env.NOTIFICATION_CRON || '0 9 * * *'
};
