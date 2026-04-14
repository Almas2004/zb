import dayjs from 'dayjs';
import { calculateControlDates, CONTROL_DEFINITIONS, getDateStatus } from './dateRules.js';
import { query, transaction } from './db.js';

const CASE_SELECT = `
  c.id,
  c.dgd AS "dgd",
  c.court_name AS "courtName",
  c.debtor_full_name AS "debtorFullName",
  c.debtor_iin AS "debtorIin",
  c.registration_address AS "registrationAddress",
  c.debtor_contacts AS "debtorContacts",
  c.production_language AS "productionLanguage",
  c.work_status AS "workStatus",
  c.representative_full_name AS "representativeFullName",
  c.representative_contacts AS "representativeContacts",
  c.fu_service_payment_date AS "fuServicePaymentDate",
  c.fu_service_payment_count AS "fuServicePaymentCount",
  c.court_decision_status AS "courtDecisionStatus",
  c.court_decision_date AS "courtDecisionDate",
  c.created_at AS "createdAt",
  c.updated_at AS "updatedAt"
`;

function normalizeCaseRow(row) {
  return {
    ...row,
    fuServicePaymentDate: row.fuServicePaymentDate ? dayjs(row.fuServicePaymentDate).format('YYYY-MM-DD') : null,
    courtDecisionDate: row.courtDecisionDate ? dayjs(row.courtDecisionDate).format('YYYY-MM-DD') : null
  };
}

function normalizeControlRow(row) {
  const dueDate = row.dueDate ? dayjs(row.dueDate).format('YYYY-MM-DD') : null;
  const definition = CONTROL_DEFINITIONS.find((item) => item.key === row.controlKey);
  return {
    id: row.id,
    key: row.controlKey,
    label: row.label,
    shortLabel: definition?.shortLabel || row.label,
    dueDate,
    acknowledged: row.acknowledged,
    acknowledgedAt: row.acknowledgedAt,
    acknowledgedBy: row.acknowledgedBy,
    acknowledgedTelegramUserId: row.acknowledgedTelegramUserId,
    status: getDateStatus(dueDate, row.acknowledged)
  };
}

export async function syncControlDates(client, caseId, courtDecisionDate) {
  const calculated = calculateControlDates(courtDecisionDate);
  for (const item of calculated) {
    const existing = await client.query(
      'SELECT due_date, acknowledged FROM control_dates WHERE case_id = $1 AND control_key = $2',
      [caseId, item.key]
    );
    const existingDate = existing.rows[0]?.due_date ? dayjs(existing.rows[0].due_date).format('YYYY-MM-DD') : null;
    const shouldResetAck = existingDate !== item.dueDate;
    await client.query(
      `INSERT INTO control_dates (case_id, control_key, label, due_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (case_id, control_key)
       DO UPDATE SET
        label = EXCLUDED.label,
        due_date = EXCLUDED.due_date,
        acknowledged = CASE WHEN $5 THEN FALSE ELSE control_dates.acknowledged END,
        acknowledged_at = CASE WHEN $5 THEN NULL ELSE control_dates.acknowledged_at END,
        acknowledged_by = CASE WHEN $5 THEN NULL ELSE control_dates.acknowledged_by END,
        acknowledged_telegram_user_id = CASE WHEN $5 THEN NULL ELSE control_dates.acknowledged_telegram_user_id END,
        updated_at = now()`,
      [caseId, item.key, item.label, item.dueDate, shouldResetAck]
    );
  }
}

export async function listCases(params) {
  const page = Math.max(Number(params.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(params.pageSize || 10), 5), 100);
  const offset = (page - 1) * pageSize;
  const search = params.search ? `%${params.search}%` : null;
  const workStatus = params.workStatus || null;
  const dgd = params.dgd || null;
  const sortMap = {
    dgd: 'c.dgd',
    debtorFullName: 'c.debtor_full_name',
    debtorIin: 'c.debtor_iin',
    workStatus: 'c.work_status',
    courtDecisionDate: 'c.court_decision_date',
    createdAt: 'c.created_at'
  };
  const sortBy = sortMap[params.sortBy] || 'c.created_at';
  const sortOrder = String(params.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = [];
  const values = [];
  if (search) {
    values.push(search);
    where.push(`(c.dgd ILIKE $${values.length} OR c.court_name ILIKE $${values.length} OR c.debtor_full_name ILIKE $${values.length} OR c.debtor_iin ILIKE $${values.length} OR c.work_status ILIKE $${values.length})`);
  }
  if (workStatus) {
    values.push(workStatus);
    where.push(`c.work_status = $${values.length}`);
  }
  if (dgd) {
    values.push(dgd);
    where.push(`c.dgd = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const count = await query(`SELECT count(*)::int AS total FROM cases c ${whereSql}`, values);
  values.push(pageSize, offset);
  const result = await query(
    `SELECT ${CASE_SELECT}
     FROM cases c
     ${whereSql}
     ORDER BY ${sortBy} ${sortOrder} NULLS LAST
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  const caseIds = result.rows.map((row) => row.id);
  const controls =
    caseIds.length === 0
      ? []
      : (
          await query(
            `SELECT id, case_id AS "caseId", control_key AS "controlKey", label, due_date AS "dueDate",
              acknowledged, acknowledged_at AS "acknowledgedAt", acknowledged_by AS "acknowledgedBy",
              acknowledged_telegram_user_id AS "acknowledgedTelegramUserId"
             FROM control_dates
             WHERE case_id = ANY($1::uuid[])
             ORDER BY due_date NULLS LAST`,
            [caseIds]
          )
        ).rows;

  const controlsByCase = new Map();
  controls.forEach((control) => {
    if (!controlsByCase.has(control.caseId)) controlsByCase.set(control.caseId, []);
    controlsByCase.get(control.caseId).push(normalizeControlRow(control));
  });

  return {
    data: result.rows.map((row) => ({ ...normalizeCaseRow(row), controlDates: controlsByCase.get(row.id) || [] })),
    pagination: { page, pageSize, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / pageSize) }
  };
}

export async function getCase(id) {
  const result = await query(`SELECT ${CASE_SELECT} FROM cases c WHERE c.id = $1`, [id]);
  if (result.rowCount === 0) return null;
  const controls = await query(
    `SELECT id, control_key AS "controlKey", label, due_date AS "dueDate", acknowledged,
      acknowledged_at AS "acknowledgedAt", acknowledged_by AS "acknowledgedBy",
      acknowledged_telegram_user_id AS "acknowledgedTelegramUserId"
     FROM control_dates
     WHERE case_id = $1
     ORDER BY due_date NULLS LAST`,
    [id]
  );
  return { ...normalizeCaseRow(result.rows[0]), controlDates: controls.rows.map(normalizeControlRow) };
}

export async function createCase(payload) {
  const caseId = await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO cases (
        dgd, court_name, debtor_full_name, debtor_iin, registration_address, debtor_contacts, production_language, work_status,
        representative_full_name, representative_contacts, fu_service_payment_date, fu_service_payment_count,
        court_decision_status, court_decision_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id`,
      [
        payload.dgd,
        payload.courtName,
        payload.debtorFullName,
        payload.debtorIin,
        payload.registrationAddress,
        payload.debtorContacts,
        payload.productionLanguage,
        payload.workStatus,
        payload.representativeFullName,
        payload.representativeContacts,
        payload.fuServicePaymentDate,
        payload.fuServicePaymentCount,
        payload.courtDecisionStatus,
        payload.courtDecisionDate
      ]
    );
    await syncControlDates(client, result.rows[0].id, payload.courtDecisionDate);
    return result.rows[0].id;
  });
  return getCase(caseId);
}

export async function updateCase(id, payload) {
  const caseId = await transaction(async (client) => {
    const result = await client.query(
      `UPDATE cases SET
        dgd = $2,
        court_name = $3,
        debtor_full_name = $4,
        debtor_iin = $5,
        registration_address = $6,
        debtor_contacts = $7,
        production_language = $8,
        work_status = $9,
        representative_full_name = $10,
        representative_contacts = $11,
        fu_service_payment_date = $12,
        fu_service_payment_count = $13,
        court_decision_status = $14,
        court_decision_date = $15,
        updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        payload.dgd,
        payload.courtName,
        payload.debtorFullName,
        payload.debtorIin,
        payload.registrationAddress,
        payload.debtorContacts,
        payload.productionLanguage,
        payload.workStatus,
        payload.representativeFullName,
        payload.representativeContacts,
        payload.fuServicePaymentDate,
        payload.fuServicePaymentCount,
        payload.courtDecisionStatus,
        payload.courtDecisionDate
      ]
    );
    if (result.rowCount === 0) return null;
    await syncControlDates(client, id, payload.courtDecisionDate);
    return id;
  });
  return caseId ? getCase(caseId) : null;
}

export async function deleteCase(id) {
  const result = await query('DELETE FROM cases WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export async function acknowledgeControlDate(controlDateId, acknowledgement) {
  const result = await query(
    `UPDATE control_dates
     SET acknowledged = TRUE,
      acknowledged_at = now(),
      acknowledged_by = $2,
      acknowledged_telegram_user_id = $3,
      updated_at = now()
     WHERE id = $1
     RETURNING case_id AS "caseId"`,
    [controlDateId, acknowledgement.by || 'CRM', acknowledgement.telegramUserId || null]
  );
  return result.rows[0] || null;
}

export async function getDictionaries() {
  const [statuses, dgds] = await Promise.all([
    query("SELECT DISTINCT work_status AS value FROM cases WHERE work_status IS NOT NULL AND trim(work_status) <> '' ORDER BY work_status"),
    query("SELECT DISTINCT dgd AS value FROM cases WHERE dgd IS NOT NULL AND trim(dgd) <> '' ORDER BY dgd")
  ]);
  return {
    workStatuses: statuses.rows.map((row) => row.value),
    dgds: dgds.rows.map((row) => row.value)
  };
}

export async function getDashboardStats() {
  const [summaryResult, statusResult, dgdResult, upcomingResult] = await Promise.all([
    query(
      `SELECT
        (SELECT count(*)::int FROM cases) AS "totalCases",
        (SELECT count(*)::int FROM control_dates WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND acknowledged = FALSE) AS "overdueControlDates",
        (SELECT count(*)::int FROM control_dates WHERE acknowledged = TRUE) AS "acknowledgedControlDates",
        (SELECT count(*)::int FROM control_dates WHERE due_date = CURRENT_DATE + INTERVAL '1 day') AS "tomorrowControlDates",
        (SELECT count(*)::int FROM cases WHERE court_decision_date IS NOT NULL) AS "withCourtDecisionDate"`
    ),
    query(
      `SELECT work_status AS label, count(*)::int AS value
       FROM cases
       WHERE work_status IS NOT NULL AND trim(work_status) <> ''
       GROUP BY work_status
       ORDER BY value DESC, label ASC`
    ),
    query(
      `SELECT dgd AS label, count(*)::int AS value
       FROM cases
       WHERE dgd IS NOT NULL AND trim(dgd) <> ''
       GROUP BY dgd
       ORDER BY value DESC, label ASC
       LIMIT 8`
    ),
    query(
      `SELECT
        c.id AS "caseId",
        c.dgd,
        c.court_name AS "courtName",
        c.debtor_full_name AS "debtorFullName",
        c.debtor_iin AS "debtorIin",
        c.work_status AS "workStatus",
        cd.id,
        cd.control_key AS "controlKey",
        cd.label,
        cd.due_date AS "dueDate",
        cd.acknowledged,
        cd.acknowledged_at AS "acknowledgedAt",
        cd.acknowledged_by AS "acknowledgedBy",
        cd.acknowledged_telegram_user_id AS "acknowledgedTelegramUserId"
       FROM control_dates cd
       JOIN cases c ON c.id = cd.case_id
       WHERE cd.due_date IS NOT NULL
       ORDER BY cd.due_date ASC
       LIMIT 8`
    )
  ]);

  return {
    summary: summaryResult.rows[0],
    byStatus: statusResult.rows,
    byDgd: dgdResult.rows,
    upcomingControlDates: upcomingResult.rows.map((row) => ({
      caseId: row.caseId,
      dgd: row.dgd,
      courtName: row.courtName,
      debtorFullName: row.debtorFullName,
      debtorIin: row.debtorIin,
      workStatus: row.workStatus,
      controlDate: normalizeControlRow(row)
    }))
  };
}
