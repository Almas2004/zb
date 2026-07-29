import { z } from "zod";
import { EVENT_DATES } from "./constants";

const phoneRegex = /^\+7\s?\(?7\d{2}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(phoneRegex, "Введите казахстанский номер в формате +7 7XX XXX XX XX"),
  category: z.enum(["GUEST", "FARMER"]),
  language: z.enum(["RU", "KZ"]).default("RU"),
  dates: z.array(z.enum(EVENT_DATES)).min(1).max(2).optional(),
  consentAccepted: z.boolean().refine((value) => value === true, "Необходимо согласие"),
  source: z.string().trim().max(120).optional(),
  website: z.string().max(0).optional()
});

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
  return phone.replace(/[^\d+]/g, "").replace(/^8/, "+7");
}
