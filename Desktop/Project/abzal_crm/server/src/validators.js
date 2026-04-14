import { z } from 'zod';

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value === undefined || value === null ? null : String(value).trim() || null));

export const caseSchema = z.object({
  dgd: z.string().trim().min(1, 'ДГД обязательно'),
  courtName: optionalText,
  debtorFullName: z.string().trim().min(1, 'ФИО должника обязательно'),
  debtorIin: z.string().trim().min(1, 'ИИН обязателен'),
  registrationAddress: optionalText,
  debtorContacts: optionalText,
  productionLanguage: optionalText,
  workStatus: optionalText,
  representativeFullName: optionalText,
  representativeContacts: optionalText,
  fuServicePaymentDate: optionalDate,
  fuServicePaymentCount: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => (value === '' || value === null || value === undefined ? null : Number(value)))
    .refine((value) => value === null || Number.isInteger(value), 'Кол-во оплат должно быть числом'),
  courtDecisionStatus: optionalText,
  courtDecisionDate: optionalDate
});

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(1)
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'ФИО обязательно'),
  username: z
    .string()
    .trim()
    .min(3, 'Логин должен быть не короче 3 символов')
    .max(50, 'Логин слишком длинный')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Логин может содержать только буквы, цифры, точку, дефис и нижнее подчеркивание'),
  password: z.string().min(1)
});
