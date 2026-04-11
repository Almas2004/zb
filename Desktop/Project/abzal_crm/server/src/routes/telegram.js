import express from 'express';
import { config } from '../config.js';
import { acknowledgeControlDate } from '../casesService.js';
import {
  buildCaseSearchMessages,
  buildHelpTelegramMessages,
  buildNameSearchMessages,
  buildOverdueTelegramMessages,
  buildStatsTelegramMessages,
  buildTodayTelegramMessages,
  buildTomorrowTelegramMessages,
  buildUnconfirmedTelegramMessages,
  buildWeekTelegramMessages
} from '../telegramCommandService.js';
import { answerCallbackQuery, sendTelegramMessage } from '../telegram.js';

export const telegramRouter = express.Router();

function getNormalizedText(text = '') {
  return text.trim();
}

function getCommandName(text = '') {
  const normalized = getNormalizedText(text);
  if (!normalized.startsWith('/')) return '';
  return normalized.split(/\s+/)[0].toLowerCase();
}

function getCommandArg(text = '') {
  const normalized = getNormalizedText(text);
  const parts = normalized.split(/\s+/);
  return parts.slice(1).join(' ').trim();
}

function isCommand(text, names) {
  const command = getCommandName(text);
  return names.some((name) => command === name || command.startsWith(`${name}@`));
}

async function sendMessageList(chatId, replyMessages, replyToMessageId) {
  for (let index = 0; index < replyMessages.length; index += 1) {
    await sendTelegramMessage({
      chatId: String(chatId),
      text: replyMessages[index],
      replyToMessageId: index === 0 ? replyToMessageId : undefined
    });
  }
}

export async function processTelegramUpdate(update) {
  const callback = update.callback_query;
  const data = callback?.data || '';
  if (data.startsWith('ack:')) {
    const controlDateId = data.slice(4);
    const from = callback.from;
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || from?.username || 'Telegram';
    await acknowledgeControlDate(controlDateId, {
      by: from?.username ? `@${from.username}` : name,
      telegramUserId: from?.id ? String(from.id) : null
    });
    await answerCallbackQuery(callback.id, 'CRM: прочтение зафиксировано');
  }

  const message = update.message;
  const text = message?.text || '';
  if (!message || !text) {
    return;
  }

  let replyMessages = null;

  if (isCommand(text, ['/hello'])) {
    replyMessages = ['Привет! Абзал СРМ на связи. Бот работает.'];
  } else if (isCommand(text, ['/help'])) {
    replyMessages = buildHelpTelegramMessages();
  } else if (isCommand(text, ['/today'])) {
    replyMessages = await buildTodayTelegramMessages();
  } else if (isCommand(text, ['/tomorrow'])) {
    replyMessages = await buildTomorrowTelegramMessages();
  } else if (isCommand(text, ['/week'])) {
    replyMessages = await buildWeekTelegramMessages();
  } else if (isCommand(text, ['/stats'])) {
    replyMessages = await buildStatsTelegramMessages();
  } else if (isCommand(text, ['/overdue', '/просроченные'])) {
    replyMessages = await buildOverdueTelegramMessages();
  } else if (isCommand(text, ['/unconfirmed'])) {
    replyMessages = await buildUnconfirmedTelegramMessages();
  } else if (isCommand(text, ['/case'])) {
    const arg = getCommandArg(text);
    replyMessages = arg ? await buildCaseSearchMessages(arg) : ['Используй так: /case 710206450447'];
  } else if (isCommand(text, ['/name'])) {
    const arg = getCommandArg(text);
    replyMessages = arg ? await buildNameSearchMessages(arg) : ['Используй так: /name Байрамов'];
  }

  if (replyMessages?.length) {
    await sendMessageList(message.chat.id, replyMessages, message.message_id);
  }
}

telegramRouter.post('/webhook/:secret', async (req, res, next) => {
  try {
    if (req.params.secret !== config.telegramWebhookSecret) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await processTelegramUpdate(req.body);

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
