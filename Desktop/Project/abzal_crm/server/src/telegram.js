import axios from 'axios';
import { config } from './config.js';

export function isTelegramEnabled() {
  return Boolean(config.telegramBotToken && config.telegramChatId);
}

async function telegramPost(method, payload) {
  return axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/${method}`, payload);
}

export async function sendTelegramReminder({ caseRecord, controlDate, notificationType }) {
  if (!isTelegramEnabled()) {
    return { skipped: true, reason: 'Telegram is not configured' };
  }

  const whenText = notificationType === 'tomorrow' ? 'завтра' : 'сегодня';
  const cardUrl = `${config.appUrl}/cases/${caseRecord.id}`;
  const text = [
    `Напоминание CRM: контрольная дата ${whenText}`,
    '',
    `ДГД: ${caseRecord.dgd}`,
    `ФИО должника: ${caseRecord.debtorFullName}`,
    `ИИН: ${caseRecord.debtorIin}`,
    `Контрольная дата: ${controlDate.label}`,
    `Дата: ${controlDate.dueDate}`,
    `Статус работы: ${caseRecord.workStatus || '-'}`,
    `Карточка: ${cardUrl}`
  ].join('\n');

  const response = await telegramPost('sendMessage', {
    chat_id: config.telegramChatId,
    text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Прочитал',
            callback_data: `ack:${controlDate.id}`
          }
        ]
      ]
    }
  });

  return { messageId: response.data?.result?.message_id };
}

export async function sendTelegramMessage({ chatId, text, replyToMessageId }) {
  if (!isTelegramEnabled()) {
    return { skipped: true, reason: 'Telegram is not configured' };
  }

  try {
    const response = await telegramPost('sendMessage', {
      chat_id: chatId || config.telegramChatId,
      text,
      reply_to_message_id: replyToMessageId || undefined
    });

    return { messageId: response.data?.result?.message_id };
  } catch (error) {
    const description = error?.response?.data?.description || '';
    if (replyToMessageId && description.includes('message to be replied not found')) {
      const retry = await telegramPost('sendMessage', {
        chat_id: chatId || config.telegramChatId,
        text
      });
      return { messageId: retry.data?.result?.message_id, fallbackWithoutReply: true };
    }
    throw error;
  }
}

export async function getTelegramWebhookInfo() {
  if (!isTelegramEnabled()) return null;
  const response = await axios.get(`https://api.telegram.org/bot${config.telegramBotToken}/getWebhookInfo`);
  return response.data?.result || null;
}

export async function getTelegramUpdates({ offset } = {}) {
  if (!isTelegramEnabled()) return [];
  const response = await axios.get(`https://api.telegram.org/bot${config.telegramBotToken}/getUpdates`, {
    params: {
      timeout: 0,
      allowed_updates: ['message', 'callback_query'],
      ...(offset ? { offset } : {})
    }
  });
  return response.data?.result || [];
}

export async function answerCallbackQuery(callbackQueryId, text = 'Подтверждено') {
  if (!isTelegramEnabled() || !callbackQueryId) return;
  await telegramPost('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}
