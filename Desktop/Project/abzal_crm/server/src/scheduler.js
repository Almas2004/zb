import cron from 'node-cron';
import { config } from './config.js';
import { runDueDateNotifications } from './notificationService.js';

export function startScheduler() {
  cron.schedule(config.notificationCron, async () => {
    try {
      const result = await runDueDateNotifications();
      console.log('Notification job completed', result);
    } catch (error) {
      console.error('Notification job failed', error);
    }
  });
}
