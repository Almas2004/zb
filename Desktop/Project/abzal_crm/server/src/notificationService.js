import dayjs from 'dayjs';
import { query } from './db.js';
import { sendTelegramReminder } from './telegram.js';

function notificationTypeForDueDate(dueDate, today) {
  const daysUntil = dayjs(dueDate).startOf('day').diff(dayjs(today).startOf('day'), 'day');
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil === 0) return 'due_today';
  return null;
}

export async function runDueDateNotifications(today = dayjs().format('YYYY-MM-DD')) {
  const result = await query(
    `SELECT
      cd.id AS "controlDateId",
      cd.label,
      cd.due_date AS "dueDate",
      cd.acknowledged,
      c.id AS "caseId",
      c.dgd,
      c.debtor_full_name AS "debtorFullName",
      c.debtor_iin AS "debtorIin",
      c.work_status AS "workStatus"
     FROM control_dates cd
     JOIN cases c ON c.id = cd.case_id
     WHERE cd.due_date IN ($1::date, ($1::date + interval '1 day')::date)`,
    [today]
  );

  const sent = [];
  const skipped = [];

  for (const row of result.rows) {
    const dueDate = dayjs(row.dueDate).format('YYYY-MM-DD');
    const notificationType = notificationTypeForDueDate(dueDate, today);
    if (!notificationType) continue;
    if (notificationType === 'due_today' && row.acknowledged) {
      skipped.push({ controlDateId: row.controlDateId, reason: 'already acknowledged' });
      continue;
    }

    const exists = await query(
      'SELECT id FROM notification_events WHERE control_date_id = $1 AND notification_type = $2',
      [row.controlDateId, notificationType]
    );
    if (exists.rowCount > 0) {
      skipped.push({ controlDateId: row.controlDateId, reason: 'already sent', notificationType });
      continue;
    }

    const telegramResult = await sendTelegramReminder({
      caseRecord: {
        id: row.caseId,
        dgd: row.dgd,
        debtorFullName: row.debtorFullName,
        debtorIin: row.debtorIin,
        workStatus: row.workStatus
      },
      controlDate: { id: row.controlDateId, label: row.label, dueDate },
      notificationType
    });

    await query(
      `INSERT INTO notification_events (control_date_id, notification_type, telegram_message_id)
       VALUES ($1, $2, $3)`,
      [row.controlDateId, notificationType, telegramResult.messageId ? String(telegramResult.messageId) : null]
    );
    sent.push({ controlDateId: row.controlDateId, notificationType, telegram: telegramResult });
  }

  return { today, sent, skipped };
}

export async function getOverdueControlDates(limit = 50) {
  const result = await query(
    `SELECT
      c.id AS "caseId",
      c.dgd,
      c.debtor_full_name AS "debtorFullName",
      c.debtor_iin AS "debtorIin",
      c.work_status AS "workStatus",
      cd.label,
      cd.due_date AS "dueDate"
     FROM control_dates cd
     JOIN cases c ON c.id = cd.case_id
     WHERE cd.due_date IS NOT NULL
       AND cd.due_date < CURRENT_DATE
       AND cd.acknowledged = FALSE
     ORDER BY cd.due_date ASC, c.debtor_full_name ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    caseId: row.caseId,
    dgd: row.dgd,
    debtorFullName: row.debtorFullName,
    debtorIin: row.debtorIin,
    workStatus: row.workStatus,
    label: row.label,
    dueDate: dayjs(row.dueDate).format('YYYY-MM-DD')
  }));
}

export async function buildOverdueTelegramText(limit = 50) {
  const messages = await buildOverdueTelegramMessages(limit);
  return messages.join('\n\n');
}

export async function buildOverdueTelegramMessages(limit = 50, maxLength = 3500) {
  const rows = await getOverdueControlDates(limit);
  if (rows.length === 0) {
    return ['Просроченных контрольных дат сейчас нет.'];
  }

  const header = `Просроченные контрольные даты: ${rows.length}`;
  const messages = [];
  let currentMessage = `${header}\n`;

  rows.forEach((item, index) => {
    const block = [
      '',
      `${index + 1}. ${item.debtorFullName}`,
      `ДГД: ${item.dgd}`,
      `ИИН: ${item.debtorIin}`,
      `Контроль: ${item.label}`,
      `Дата: ${item.dueDate}`,
      `Статус: ${item.workStatus || '-'}`
    ].join('\n');

    if (`${currentMessage}${block}`.length > maxLength) {
      messages.push(currentMessage.trim());
      currentMessage = `${header}\n${block}`;
    } else {
      currentMessage += block;
    }
  });

  if (currentMessage.trim()) {
    messages.push(currentMessage.trim());
  }

  return messages;
}
