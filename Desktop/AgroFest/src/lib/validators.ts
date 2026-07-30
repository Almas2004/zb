import { z } from "zod";
import { EVENT_DATES } from "./constants";

const PHONE_ERROR_RU = "Введите корректный казахстанский номер телефона";
const PHONE_ERROR_KZ = "Қазақстандық телефон нөмірін дұрыс енгізіңіз";
const KAZAKHSTAN_MOBILE_DIGITS = /^77\d{9}$/;

export function normalizeKazakhstanPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  if ((trimmed.match(/\+/g) || []).length > 1) return null;
  if (trimmed.includes("+") && !trimmed.startsWith("+")) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (digits.length !== 11) return null;
  if (!digits.startsWith("7")) return null;
  if (!KAZAKHSTAN_MOBILE_DIGITS.test(digits)) return null;
  if (/^(\d)\1+$/.test(digits)) return null;

  return `+${digits}`;
}

export function formatKazakhstanPhone(value: string) {
  const normalized = normalizeKazakhstanPhone(value);
  if (!normalized) return value;
  const digits = normalized.slice(1);
  return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim(),
  category: z.enum(["GUEST", "FARMER"]),
  language: z.enum(["RU", "KZ"]).default("RU"),
  dates: z.array(z.enum(EVENT_DATES)).min(1).max(2).optional(),
  consentAccepted: z.boolean().refine((value) => value === true, "Необходимо согласие"),
  source: z.string().trim().max(120).optional(),
  website: z.string().max(0).optional()
}).superRefine((value, ctx) => {
  if (!normalizeKazakhstanPhone(value.phone)) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: value.language === "KZ" ? PHONE_ERROR_KZ : PHONE_ERROR_RU
    });
  }
}).transform((value) => ({
  ...value,
  phone: normalizeKazakhstanPhone(value.phone) || value.phone
}));

export const loginSchema = z.object({
  login: z.string().trim().min(2),
  password: z.string().min(8)
});

export const checkInSchema = z.object({
  token: z.string().min(20),
  eventDate: z.enum(EVENT_DATES),
  scannerDeviceToken: z.string().min(8).max(160).optional(),
  scannerDeviceName: z.string().max(120).optional(),
  operationId: z.string().min(8).max(120)
});

export const guestFiltersSchema = z.object({
  q: z.string().optional(),
  category: z.enum(["GUEST", "FARMER"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional(),
  eventDate: z.enum(EVENT_DATES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export function normalizePhone(phone: string) {
  const normalized = normalizeKazakhstanPhone(phone);
  if (!normalized) {
    throw new Error(PHONE_ERROR_RU);
  }
  return normalized;
}
