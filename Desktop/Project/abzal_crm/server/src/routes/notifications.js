import express from 'express';
import { runDueDateNotifications } from '../notificationService.js';

export const notificationsRouter = express.Router();

notificationsRouter.post('/run', async (req, res, next) => {
  try {
    res.json(await runDueDateNotifications(req.body?.today));
  } catch (error) {
    next(error);
  }
});
