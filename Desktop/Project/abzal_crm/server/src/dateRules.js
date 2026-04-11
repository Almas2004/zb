import dayjs from 'dayjs';

export const CONTROL_DEFINITIONS = [
  {
    key: 'dgd_announcement_letter',
    label: 'Дата направления в ДГД объявления и сопроводительного письма от ФУ',
    shortLabel: 'Направление в ДГД',
    dependsOn: 'courtDecisionDate',
    offsetBusinessDays: 2
  },
  {
    key: 'state_requests',
    label: 'Направить запросы в гос органы',
    shortLabel: 'Запросы в госорганы',
    dependsOn: 'courtDecisionDate',
    offsetBusinessDays: 5
  },
  {
    key: 'state_responses',
    label: 'Ответы гос.органы',
    shortLabel: 'Ответы госорганов',
    dependsOn: 'courtDecisionDate',
    offsetBusinessDays: 10
  },
  {
    key: 'prepare_conclusion',
    label: 'Подготовить заключение',
    shortLabel: 'Подготовить заключение',
    dependsOn: 'courtDecisionDate',
    offsetBusinessDays: 20
  },
  {
    key: 'creditor_claims_collection',
    label: 'Сбор от кредиторов реестра требований кредиторов',
    shortLabel: 'Сбор требований',
    dependsOn: 'dgd_announcement_letter',
    offsetBusinessDays: 20
  },
  {
    key: 'creditor_claims_registry_submission',
    label: 'Подача реестра требований кредиторов',
    shortLabel: 'Подача реестра',
    dependsOn: 'creditor_claims_collection',
    offsetBusinessDays: 10
  }
];

export function isBusinessDay(date, holidays = []) {
  const value = dayjs(date);
  const day = value.day();
  const iso = value.format('YYYY-MM-DD');
  return day !== 0 && day !== 6 && !holidays.includes(iso);
}

export function addBusinessDays(date, days, holidays = []) {
  if (!date) return null;
  let current = dayjs(date);
  let added = 0;
  while (added < days) {
    current = current.add(1, 'day');
    if (isBusinessDay(current, holidays)) added += 1;
  }
  return current.format('YYYY-MM-DD');
}

export function calculateControlDates(courtDecisionDate, holidays = []) {
  if (!courtDecisionDate) {
    return CONTROL_DEFINITIONS.map((definition) => ({ ...definition, dueDate: null }));
  }

  const values = { courtDecisionDate: dayjs(courtDecisionDate).format('YYYY-MM-DD') };
  return CONTROL_DEFINITIONS.map((definition) => {
    const sourceDate = values[definition.dependsOn];
    const dueDate = sourceDate ? addBusinessDays(sourceDate, definition.offsetBusinessDays, holidays) : null;
    values[definition.key] = dueDate;
    return { ...definition, dueDate };
  });
}

export function getDateStatus(dueDate, acknowledged, today = dayjs().format('YYYY-MM-DD')) {
  if (!dueDate) return 'empty';
  const daysUntil = dayjs(dueDate).startOf('day').diff(dayjs(today).startOf('day'), 'day');
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil <= 0 && acknowledged) return 'acknowledged';
  if (daysUntil <= 0 && !acknowledged) return 'overdue';
  return 'future';
}
