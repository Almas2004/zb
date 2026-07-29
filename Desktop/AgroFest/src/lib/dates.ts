export const ALMATY_TIME_ZONE = "Asia/Almaty";
export const EVENT_DATE_KEYS = ["2026-07-31", "2026-08-01"] as const;
export type EventDateKey = (typeof EVENT_DATE_KEYS)[number];

export function eventDateToDbDate(date: EventDateKey | string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10) as EventDateKey;
}

export function formatAlmatyDateTime(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: ALMATY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

export function currentAlmatyDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ALMATY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}` as EventDateKey;
}

export function isEventDateKey(date: string | undefined): date is EventDateKey {
  return EVENT_DATE_KEYS.includes(date as EventDateKey);
}

export function resolveServerRegistrationDate(now = new Date()) {
  const today = currentAlmatyDateKey(now);
  if (isEventDateKey(today)) return today;

  if (process.env.ALLOW_OUTSIDE_EVENT_DATES === "true" && isEventDateKey(process.env.TEST_EVENT_DATE)) {
    return process.env.TEST_EVENT_DATE;
  }

  return null;
}

export function formatEventDateLabel(date: EventDateKey | string, locale: "ru" | "kk" = "ru") {
  const dbDate = eventDateToDbDate(date);
  return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
    timeZone: ALMATY_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(dbDate);
}
