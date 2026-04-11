import dayjs from 'dayjs';
import { config } from './config.js';
import { query } from './db.js';
import { getDateStatus } from './dateRules.js';

const MAX_MESSAGE_LENGTH = 3500;

function formatCaseLink(caseId) {
  return `${config.appUrl}/cases/${caseId}`;
}

function formatControlBlock(item, index) {
  return [
    `${index + 1}. ${item.debtorFullName}`,
    `ДГД: ${item.dgd || '-'}`,
    `ИИН: ${item.debtorIin || '-'}`,
    `Контроль: ${item.label}`,
    `Дата: ${item.dueDate}`,
    `Статус: ${item.workStatus || '-'}`,
    `Карточка: ${formatCaseLink(item.caseId)}`
  ].join('\n');
}

function formatCaseBlock(item, index) {
  return [
    `${index + 1}. ${item.debtorFullName}`,
    `ИИН: ${item.debtorIin || '-'}`,
    `ДГД: ${item.dgd || '-'}`,
    `Суд: ${item.courtName || '-'}`,
    `Статус: ${item.workStatus || '-'}`,
    `Дата определения суда: ${item.courtDecisionDate || '-'}`,
    `Карточка: ${formatCaseLink(item.id)}`
  ].join('\n');
}

function splitIntoMessages(header, blocks, maxLength = MAX_MESSAGE_LENGTH) {
  if (blocks.length === 0) return [header];

  const messages = [];
  let current = header;

  for (const block of blocks) {
    const candidate = `${current}\n\n${block}`;
    if (candidate.length > maxLength && current !== header) {
      messages.push(current);
      current = `${header}\n\n${block}`;
      continue;
    }

    if (candidate.length > maxLength) {
      messages.push(`${header}\n\n${block.slice(0, maxLength - header.length - 4)}`);
      current = header;
      continue;
    }

    current = candidate;
  }

  if (current !== header || messages.length === 0) {
    messages.push(current);
  }

  return messages;
}

function normalizeControlRow(row) {
  const dueDate = row.dueDate ? dayjs(row.dueDate).format('YYYY-MM-DD') : null;
  return {
    caseId: row.caseId,
    controlDateId: row.controlDateId,
    dgd: row.dgd,
    debtorFullName: row.debtorFullName,
    debtorIin: row.debtorIin,
    workStatus: row.workStatus,
    label: row.label,
    dueDate,
    acknowledged: row.acknowledged,
    status: getDateStatus(dueDate, row.acknowledged)
  };
}

async function getControlDatesByRange({ dateFrom, dateTo, acknowledged } = {}) {
  const conditions = ['cd.due_date IS NOT NULL'];
  const values = [];

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`cd.due_date >= $${values.length}::date`);
  }
  if (dateTo) {
    values.push(dateTo);
    conditions.push(`cd.due_date <= $${values.length}::date`);
  }
  if (typeof acknowledged === 'boolean') {
    values.push(acknowledged);
    conditions.push(`cd.acknowledged = $${values.length}`);
  }

  const result = await query(
    `SELECT
      cd.id AS "controlDateId",
      cd.case_id AS "caseId",
      cd.label,
      cd.due_date AS "dueDate",
      cd.acknowledged,
      c.dgd,
      c.debtor_full_name AS "debtorFullName",
      c.debtor_iin AS "debtorIin",
      c.work_status AS "workStatus"
     FROM control_dates cd
     JOIN cases c ON c.id = cd.case_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY cd.due_date ASC, c.debtor_full_name ASC
     LIMIT 100`,
    values
  );

  return result.rows.map(normalizeControlRow);
}

async function getOverdueControlDates(limit = 50) {
  const result = await query(
    `SELECT
      cd.id AS "controlDateId",
      cd.case_id AS "caseId",
      cd.label,
      cd.due_date AS "dueDate",
      cd.acknowledged,
      c.dgd,
      c.debtor_full_name AS "debtorFullName",
      c.debtor_iin AS "debtorIin",
      c.work_status AS "workStatus"
     FROM control_dates cd
     JOIN cases c ON c.id = cd.case_id
     WHERE cd.due_date IS NOT NULL
       AND cd.due_date < CURRENT_DATE
       AND cd.acknowledged = FALSE
     ORDER BY cd.due_date ASC, c.debtor_full_name ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(normalizeControlRow);
}

async function searchCasesByIin(searchValue) {
  const sanitized = String(searchValue || '').replace(/\D/g, '');
  if (!sanitized) {
    return [];
  }

  const result = await query(
    `SELECT
      id,
      dgd,
      court_name AS "courtName",
      debtor_full_name AS "debtorFullName",
      debtor_iin AS "debtorIin",
      work_status AS "workStatus",
      CASE WHEN court_decision_date IS NOT NULL
        THEN to_char(court_decision_date, 'YYYY-MM-DD')
        ELSE NULL
      END AS "courtDecisionDate"
     FROM cases
     WHERE regexp_replace(coalesce(debtor_iin, ''), '\D', '', 'g') LIKE $1
     ORDER BY debtor_full_name ASC
     LIMIT 10`,
    [`%${sanitized}%`]
  );

  return result.rows;
}

async function searchCasesByName(searchValue) {
  const term = String(searchValue || '').trim();
  if (!term) {
    return [];
  }

  const result = await query(
    `SELECT
      id,
      dgd,
      court_name AS "courtName",
      debtor_full_name AS "debtorFullName",
      debtor_iin AS "debtorIin",
      work_status AS "workStatus",
      CASE WHEN court_decision_date IS NOT NULL
        THEN to_char(court_decision_date, 'YYYY-MM-DD')
        ELSE NULL
      END AS "courtDecisionDate"
     FROM cases
     WHERE debtor_full_name ILIKE $1
     ORDER BY debtor_full_name ASC
     LIMIT 10`,
    [`%${term}%`]
  );

  return result.rows;
}

async function getStats() {
  const result = await query(
    `SELECT
      (SELECT count(*)::int FROM cases) AS "totalCases",
      (SELECT count(*)::int FROM cases WHERE court_decision_date IS NOT NULL) AS "withCourtDecisionDate",
      (SELECT count(*)::int FROM cases WHERE court_decision_date IS NULL) AS "withoutCourtDecisionDate",
      (SELECT count(*)::int FROM control_dates WHERE due_date = CURRENT_DATE AND acknowledged = FALSE) AS "dueToday",
      (SELECT count(*)::int FROM control_dates WHERE due_date = CURRENT_DATE + INTERVAL '1 day' AND acknowledged = FALSE) AS "dueTomorrow",
      (SELECT count(*)::int FROM control_dates WHERE due_date < CURRENT_DATE AND acknowledged = FALSE) AS "overdue",
      (SELECT count(*)::int FROM control_dates WHERE acknowledged = TRUE) AS "acknowledged"`
  );

  return result.rows[0];
}

export async function buildOverdueTelegramMessages(limit = 50) {
  const rows = await getOverdueControlDates(limit);
  if (rows.length === 0) {
    return ['Просроченных контрольных дат сейчас нет.'];
  }

  const blocks = rows.map(formatControlBlock);
  return splitIntoMessages(`Просроченные контрольные даты: ${rows.length}`, blocks);
}

export async function buildTodayTelegramMessages() {
  const today = dayjs().format('YYYY-MM-DD');
  const rows = await getControlDatesByRange({ dateFrom: today, dateTo: today, acknowledged: false });
  if (rows.length === 0) {
    return ['На сегодня активных контрольных дат нет.'];
  }

  const blocks = rows.map(formatControlBlock);
  return splitIntoMessages(`Контрольные даты на сегодня: ${rows.length}`, blocks);
}

export async function buildTomorrowTelegramMessages() {
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const rows = await getControlDatesByRange({ dateFrom: tomorrow, dateTo: tomorrow, acknowledged: false });
  if (rows.length === 0) {
    return ['На завтра активных контрольных дат нет.'];
  }

  const blocks = rows.map(formatControlBlock);
  return splitIntoMessages(`Контрольные даты на завтра: ${rows.length}`, blocks);
}

export async function buildWeekTelegramMessages() {
  const today = dayjs().format('YYYY-MM-DD');
  const weekEnd = dayjs().add(6, 'day').format('YYYY-MM-DD');
  const rows = await getControlDatesByRange({ dateFrom: today, dateTo: weekEnd, acknowledged: false });
  if (rows.length === 0) {
    return ['На ближайшие 7 дней активных контрольных дат нет.'];
  }

  const blocks = rows.map(formatControlBlock);
  return splitIntoMessages(`Контрольные даты на 7 дней: ${rows.length}`, blocks);
}

export async function buildUnconfirmedTelegramMessages(limit = 50) {
  const rows = await getOverdueControlDates(limit);
  if (rows.length === 0) {
    return ['Неподтвержденных просроченных дат сейчас нет.'];
  }

  const blocks = rows.map(formatControlBlock);
  return splitIntoMessages(`Неподтвержденные просроченные даты: ${rows.length}`, blocks);
}

export async function buildStatsTelegramMessages() {
  const stats = await getStats();
  return [
    [
      'Сводка Абзал СРМ:',
      `Всего дел: ${stats.totalCases}`,
      `С датой определения суда: ${stats.withCourtDecisionDate}`,
      `Без даты определения суда: ${stats.withoutCourtDecisionDate}`,
      `На сегодня: ${stats.dueToday}`,
      `На завтра: ${stats.dueTomorrow}`,
      `Просрочено: ${stats.overdue}`,
      `Подтверждено: ${stats.acknowledged}`
    ].join('\n')
  ];
}

export async function buildCaseSearchMessages(queryText) {
  const rows = await searchCasesByIin(queryText);
  if (rows.length === 0) {
    return ['По этому ИИН ничего не найдено.'];
  }

  const blocks = rows.map(formatCaseBlock);
  return splitIntoMessages(`Найдено дел по ИИН: ${rows.length}`, blocks);
}

export async function buildNameSearchMessages(queryText) {
  const rows = await searchCasesByName(queryText);
  if (rows.length === 0) {
    return ['По этому ФИО ничего не найдено.'];
  }

  const blocks = rows.map(formatCaseBlock);
  return splitIntoMessages(`Найдено дел по ФИО: ${rows.length}`, blocks);
}

export function buildHelpTelegramMessages() {
  return [
    [
      'Команды Абзал СРМ:',
      '/help - список команд',
      '/hello - проверка бота',
      '/today - контрольные даты на сегодня',
      '/tomorrow - контрольные даты на завтра',
      '/week - контрольные даты на 7 дней',
      '/stats - сводка по CRM',
      '/overdue - все просроченные даты',
      '/unconfirmed - все неподтвержденные просроченные даты',
      '/case <ИИН> - поиск дела по ИИН',
      '/name <ФИО> - поиск дела по ФИО'
    ].join('\n')
  ];
}
