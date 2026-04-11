import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { ensureDefaultAdmin } from '../auth.js';
import { createCase } from '../casesService.js';
import { pool, query } from '../db.js';

function findDefaultExcelPath() {
  const explicit = process.env.EXCEL_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const fallback = path.join(homedir(), 'Downloads', 'для Алмаса таблица по ФИН УПР..xlsx');
  return existsSync(fallback) ? fallback : null;
}

function asString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object' && value.text) return asString(value.text);
  if (typeof value === 'object' && value.result) return asString(value.result);
  if (value instanceof Date) return dayjs(value).format('YYYY-MM-DD');
  const text = String(value).trim();
  if (!text || text === '#VALUE!') return null;
  return text;
}

function asDate(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.result) return asDate(value.result);
  if (typeof value === 'object' && value.text) return asDate(value.text);
  if (value instanceof Date) return dayjs(value).format('YYYY-MM-DD');
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return null;
}

function asInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && value.getFullYear() <= 1900) return 1;
  if (typeof value === 'object' && value.result) return asInteger(value.result);
  if (typeof value === 'object' && value.text) return asInteger(value.text);
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

const excelPath = findDefaultExcelPath();
if (!excelPath) {
  console.error('Excel file was not found. Set EXCEL_PATH to the workbook path.');
  process.exit(1);
}

await ensureDefaultAdmin();
await query('TRUNCATE notification_events, control_dates, cases RESTART IDENTITY CASCADE');

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(excelPath);
const worksheet = workbook.getWorksheet('Сводник') || workbook.worksheets[0];

let inserted = 0;
for (let rowNumber = 8; rowNumber <= worksheet.rowCount; rowNumber += 1) {
  const row = worksheet.getRow(rowNumber);
  if (!row.getCell(2).value || !row.getCell(3).value || !row.getCell(4).value) continue;
  await createCase({
    dgd: asString(row.getCell(2).value),
    debtorFullName: asString(row.getCell(3).value),
    debtorIin: asString(row.getCell(4).value),
    registrationAddress: null,
    debtorContacts: asString(row.getCell(5).value),
    productionLanguage: asString(row.getCell(6).value),
    workStatus: asString(row.getCell(7).value),
    representativeFullName: asString(row.getCell(8).value),
    representativeContacts: asString(row.getCell(9).value),
    fuServicePaymentDate: asDate(row.getCell(10).value),
    fuServicePaymentCount: asInteger(row.getCell(11).value),
    courtDecisionStatus: asString(row.getCell(12).value),
    courtDecisionDate: asDate(row.getCell(13).value)
  });
  inserted += 1;
}

await pool.end();
console.log(`Seed completed from "${worksheet.name}". Cases inserted: ${inserted}`);
