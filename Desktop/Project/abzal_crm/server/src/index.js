import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { authenticate, ensureDefaultAdmin } from './auth.js';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { casesRouter } from './routes/cases.js';
import { notificationsRouter } from './routes/notifications.js';
import { telegramRouter } from './routes/telegram.js';
import { startScheduler } from './scheduler.js';
import { startTelegramPolling } from './telegramPolling.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/cases', authenticate, casesRouter);
app.use('/api/notifications', authenticate, notificationsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Ошибка валидации', issues: error.issues });
  }
  return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

await ensureDefaultAdmin();
startScheduler();
await startTelegramPolling();

app.listen(config.port, () => {
  console.log(`CRM API is running on http://localhost:${config.port}`);
});
