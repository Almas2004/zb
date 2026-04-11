import { processTelegramUpdate } from './routes/telegram.js';
import { getTelegramUpdates, getTelegramWebhookInfo, isTelegramEnabled } from './telegram.js';

let pollingStarted = false;
let updateOffset = 0;

export async function startTelegramPolling() {
  if (pollingStarted || !isTelegramEnabled()) return;

  const webhookInfo = await getTelegramWebhookInfo();
  if (webhookInfo?.url) {
    console.log('Telegram webhook configured, polling skipped');
    return;
  }

  pollingStarted = true;
  console.log('Telegram polling started');

  const tick = async () => {
    try {
      const updates = await getTelegramUpdates({ offset: updateOffset });
      for (const update of updates) {
        updateOffset = update.update_id + 1;
        await processTelegramUpdate(update);
      }
    } catch (error) {
      console.error('Telegram polling failed', error);
    }
  };

  await tick();
  setInterval(tick, 5000);
}
