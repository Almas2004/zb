import { Prisma, ScanResult } from "@prisma/client";
import { prisma } from "./prisma";
import { EVENT_DATES, REGISTRATION_PREFIX, type EventDate } from "./constants";
import { fingerprint, randomToken, sha256 } from "./crypto";
import { normalizePhone, registrationSchema } from "./validators";
import { dateKey, eventDateToDbDate, resolveServerRegistrationDate } from "./dates";

const REGISTRATION_CLOSED_MESSAGES = {
  RU: "Регистрация доступна только 31 июля и 1 августа 2026 года.",
  KZ: "Тіркелу 2026 жылғы 31 шілде және 1 тамыз күндері ғана қолжетімді."
};

export async function nextRegistrationNumber(tx: Prisma.TransactionClient = prisma) {
  const counter = await tx.registrationCounter.upsert({
    where: { id: "guest" },
    create: { id: "guest", value: 1 },
    update: { value: { increment: 1 } }
  });
  return `${REGISTRATION_PREFIX}-${String(counter.value).padStart(6, "0")}`;
}

export async function createGuest(input: unknown) {
  const parsed = registrationSchema.parse(input);
  if (parsed.website) {
    throw new Error("Spam protection rejected the request");
  }

  const phone = normalizePhone(parsed.phone);
  const isAdminSource = parsed.source === "admin";
  const publicEventDate = isAdminSource ? null : resolveServerRegistrationDate();
  if (!isAdminSource && !publicEventDate) {
    throw new Error(REGISTRATION_CLOSED_MESSAGES[parsed.language]);
  }
  const selectedDates = isAdminSource ? parsed.dates || ["2026-07-31"] : [publicEventDate!];
  const registrationDedupKey = isAdminSource ? undefined : `phone:${phone}:${publicEventDate}`;

  if (registrationDedupKey) {
    const existing = await prisma.guest.findFirst({
      where: {
        registrationDedupKey,
        status: { not: "DELETED" }
      },
      include: { eventDates: true, checkIns: true }
    });
    if (existing) {
      await ensureSelfRegistrationCheckIn(existing.id, publicEventDate!, { source: "duplicate-registration" });
      const refreshed = await getGuestWithRelations(existing.id);
      if (!refreshed) throw new Error("Registration lookup failed");
      return { guest: refreshed, qrToken: "", alreadyRegistered: true };
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
    const qrToken = randomToken(32);
    const publicTicketToken = randomToken(24);
    const guest = await tx.guest.create({
      data: {
        registrationNumber: await nextRegistrationNumber(tx),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone,
        registrationDedupKey,
        category: parsed.category,
        language: parsed.language,
        publicTicketToken,
        qrTokenHash: sha256(qrToken),
        consentAccepted: true,
        consentAcceptedAt: new Date(),
        source: parsed.source || (isAdminSource ? "admin" : "self-registration"),
        eventDates: {
          create: selectedDates.map((eventDate) => ({ eventDate: eventDateToDbDate(eventDate) }))
        }
      },
      include: { eventDates: true }
    });

      if (!isAdminSource) {
        await tx.checkIn.create({
          data: {
            guestId: guest.id,
            eventDate: eventDateToDbDate(publicEventDate!),
            mode: "SELF_REGISTRATION",
            operationId: `self-registration:${guest.id}`,
            metadata: { source: "self-registration", language: parsed.language }
          }
        });
      }

      const withRelations = await tx.guest.findUnique({
        where: { id: guest.id },
        include: { eventDates: { orderBy: { eventDate: "asc" } }, checkIns: true }
      });
      return { guest: withRelations || guest, qrToken, alreadyRegistered: false };
    });
  } catch (error) {
    if (registrationDedupKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.guest.findFirst({
        where: { registrationDedupKey, status: { not: "DELETED" } },
        include: { eventDates: true, checkIns: true }
      });
      if (existing) {
        await ensureSelfRegistrationCheckIn(existing.id, publicEventDate!, { source: "duplicate-registration" });
        const refreshed = await getGuestWithRelations(existing.id);
        return { guest: refreshed || existing, qrToken: "", alreadyRegistered: true };
      }
    }
    throw error;
  }
}

async function ensureSelfRegistrationCheckIn(guestId: string, eventDate: EventDate, metadata: Record<string, string>) {
  await prisma.checkIn.upsert({
    where: { guestId_eventDate: { guestId, eventDate: eventDateToDbDate(eventDate) } },
    create: {
      guestId,
      eventDate: eventDateToDbDate(eventDate),
      mode: "SELF_REGISTRATION",
      operationId: `self-registration:${guestId}`,
      metadata
    },
    update: {}
  }).catch(async (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  });
}

function getGuestWithRelations(id: string) {
  return prisma.guest.findUnique({
    where: { id },
    include: { eventDates: { orderBy: { eventDate: "asc" } }, checkIns: true }
  });
}

export async function getTicket(publicTicketToken: string) {
  return prisma.guest.findUnique({
    where: { publicTicketToken },
    include: { eventDates: { orderBy: { eventDate: "asc" } }, checkIns: true }
  });
}

export async function findGuestForAdmin(id: string) {
  return prisma.guest.findUnique({
    where: { id },
    include: {
      eventDates: true,
      checkIns: { include: { scannerUser: { select: { name: true } } }, orderBy: { checkedInAt: "desc" } },
      scanAttempts: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });
}

export async function listGuests(params: { q?: string; category?: "GUEST" | "FARMER"; status?: "ACTIVE" | "BLOCKED" | "DELETED"; eventDate?: EventDate; page: number; pageSize: number }) {
  const where: Prisma.GuestWhereInput = {
    category: params.category,
    status: params.status,
    eventDates: params.eventDate ? { some: { eventDate: eventDateToDbDate(params.eventDate) } } : undefined,
    OR: params.q
      ? [
          { firstName: { contains: params.q, mode: "insensitive" } },
          { lastName: { contains: params.q, mode: "insensitive" } },
          { phone: { contains: params.q } },
          { registrationNumber: { contains: params.q, mode: "insensitive" } }
        ]
      : undefined
  };
  const [items, total] = await prisma.$transaction([
    prisma.guest.findMany({
      where,
      include: { eventDates: true, checkIns: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    }),
    prisma.guest.count({ where })
  ]);
  return { items, total };
}

export function formatDateOnly(value: Date) {
  return dateKey(value);
}

export async function checkInTicket(input: {
  token: string;
  eventDate: EventDate;
  scannerUserId?: string;
  scannerDeviceToken?: string;
  scannerDeviceName?: string;
  operationId: string;
  mode?: "ONLINE" | "OFFLINE_SYNC" | "MANUAL";
  ip?: string;
}) {
  const tokenHash = sha256(input.token);
  const tokenFingerprint = fingerprint(input.token);

  try {
    return await prisma.$transaction(async (tx) => {
      const duplicateOperation = await tx.checkIn.findUnique({ where: { operationId: input.operationId } });
      if (duplicateOperation) {
        await tx.scanAttempt.create({ data: { tokenFingerprint, result: ScanResult.DUPLICATE_OPERATION, operationId: input.operationId, ip: input.ip } });
        return { status: "red" as const, result: ScanResult.DUPLICATE_OPERATION, message: "Операция уже синхронизирована" };
      }

      const guest = await tx.guest.findUnique({
        where: { qrTokenHash: tokenHash },
        include: { eventDates: true, checkIns: { where: { eventDate: new Date(`${input.eventDate}T00:00:00.000Z`) } } }
      });

      if (!guest) {
        await tx.scanAttempt.create({ data: { tokenFingerprint, result: ScanResult.NOT_FOUND, eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.NOT_FOUND, message: "QR-код не найден" };
      }

      if (guest.status === "BLOCKED") {
        await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint, result: ScanResult.BLOCKED, reason: "blocked", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.BLOCKED, message: "Билет заблокирован", guest };
      }

      const allowed = guest.eventDates.some((date) => formatDateOnly(date.eventDate) === input.eventDate);
      if (!allowed) {
        await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint, result: ScanResult.WRONG_DAY, reason: "wrong_day", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.WRONG_DAY, message: "Билет предназначен для другого дня", guest };
      }

      if (guest.checkIns.length > 0) {
        await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint, result: ScanResult.ALREADY_USED, reason: "already_used", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.ALREADY_USED, message: "Билет уже использован", guest, firstCheckIn: guest.checkIns[0] };
      }

      let scannerDeviceId: string | undefined;
      if (input.scannerDeviceToken) {
        const device = await tx.scannerDevice.upsert({
          where: { deviceToken: input.scannerDeviceToken },
          create: { deviceToken: input.scannerDeviceToken, name: input.scannerDeviceName || "Scanner device", userId: input.scannerUserId, lastSeenAt: new Date() },
          update: { lastSeenAt: new Date(), userId: input.scannerUserId }
        });
        scannerDeviceId = device.id;
      }

      const checkIn = await tx.checkIn.create({
        data: {
          guestId: guest.id,
          eventDate: eventDateToDbDate(input.eventDate),
          scannerUserId: input.scannerUserId,
          scannerDeviceId,
          mode: input.mode || "ONLINE",
          operationId: input.operationId,
          metadata: { userAgent: "web" }
        }
      });

      await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint, result: ScanResult.ALLOWED, eventDate: checkIn.eventDate, scannerUserId: input.scannerUserId, scannerDeviceId, ip: input.ip, operationId: input.operationId } });
      return { status: "green" as const, result: ScanResult.ALLOWED, message: "Вход разрешён", guest, checkIn };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await prisma.scanAttempt.create({ data: { tokenFingerprint, result: ScanResult.ALREADY_USED, reason: "unique_constraint", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
      return { status: "red" as const, result: ScanResult.ALREADY_USED, message: "Билет уже использован" };
    }
    throw error;
  }
}

export async function checkInRegistrationNumber(input: {
  registrationNumber: string;
  eventDate: EventDate;
  scannerUserId?: string;
  scannerDeviceToken?: string;
  scannerDeviceName?: string;
  operationId: string;
  mode?: "ONLINE" | "OFFLINE_SYNC" | "MANUAL";
  ip?: string;
}) {
  const normalized = input.registrationNumber.trim().toUpperCase();
  try {
    return await prisma.$transaction(async (tx) => {
      const duplicateOperation = await tx.checkIn.findUnique({ where: { operationId: input.operationId } });
      if (duplicateOperation) {
        return { status: "red" as const, result: ScanResult.DUPLICATE_OPERATION, message: "Операция уже синхронизирована" };
      }

      const guest = await tx.guest.findUnique({
        where: { registrationNumber: normalized },
        include: { eventDates: true, checkIns: { where: { eventDate: eventDateToDbDate(input.eventDate) } } }
      });

      if (!guest) {
        await tx.scanAttempt.create({ data: { tokenFingerprint: fingerprint(normalized), result: ScanResult.NOT_FOUND, eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.NOT_FOUND, message: "Номер билета не найден" };
      }
      if (guest.status === "BLOCKED") {
        await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint: fingerprint(normalized), result: ScanResult.BLOCKED, reason: "blocked", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.BLOCKED, message: "Билет заблокирован", guest };
      }
      if (!guest.eventDates.some((date) => dateKey(date.eventDate) === input.eventDate)) {
        await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint: fingerprint(normalized), result: ScanResult.WRONG_DAY, reason: "wrong_day", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.WRONG_DAY, message: "Билет предназначен для другого дня", guest };
      }
      if (guest.checkIns.length > 0) {
        await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint: fingerprint(normalized), result: ScanResult.ALREADY_USED, reason: "already_used", eventDate: eventDateToDbDate(input.eventDate), ip: input.ip, operationId: input.operationId } });
        return { status: "red" as const, result: ScanResult.ALREADY_USED, message: "Билет уже использован", guest, firstCheckIn: guest.checkIns[0] };
      }

      let scannerDeviceId: string | undefined;
      if (input.scannerDeviceToken) {
        const device = await tx.scannerDevice.upsert({
          where: { deviceToken: input.scannerDeviceToken },
          create: { deviceToken: input.scannerDeviceToken, name: input.scannerDeviceName || "Scanner device", userId: input.scannerUserId, lastSeenAt: new Date() },
          update: { lastSeenAt: new Date(), userId: input.scannerUserId }
        });
        scannerDeviceId = device.id;
      }

      const checkIn = await tx.checkIn.create({
        data: {
          guestId: guest.id,
          eventDate: eventDateToDbDate(input.eventDate),
          scannerUserId: input.scannerUserId,
          scannerDeviceId,
          mode: input.mode || "MANUAL",
          operationId: input.operationId,
          metadata: { source: "registrationNumber" }
        }
      });
      await tx.scanAttempt.create({ data: { guestId: guest.id, tokenFingerprint: fingerprint(normalized), result: ScanResult.ALLOWED, eventDate: checkIn.eventDate, scannerUserId: input.scannerUserId, scannerDeviceId, ip: input.ip, operationId: input.operationId } });
      return { status: "green" as const, result: ScanResult.ALLOWED, message: "Вход разрешён", guest, checkIn };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "red" as const, result: ScanResult.ALREADY_USED, message: "Билет уже использован" };
    }
    throw error;
  }
}

export async function dashboardStats() {
  const [total, guests, farmers, checkIns, repeated, recentGuests, recentScans] = await prisma.$transaction([
    prisma.guest.count(),
    prisma.guest.count({ where: { category: "GUEST" } }),
    prisma.guest.count({ where: { category: "FARMER" } }),
    prisma.checkIn.count(),
    prisma.scanAttempt.count({ where: { result: "ALREADY_USED" } }),
    prisma.guest.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { eventDates: true } }),
    prisma.checkIn.findMany({ orderBy: { checkedInAt: "desc" }, take: 8, include: { guest: true, scannerUser: true } })
  ]);

  const byDate = await Promise.all(
    EVENT_DATES.map(async (date) => ({
      date,
      registered: await prisma.guestEventDate.count({ where: { eventDate: eventDateToDbDate(date) } }),
      checkedIn: await prisma.checkIn.count({ where: { eventDate: eventDateToDbDate(date) } })
    }))
  );

  const bothDays = await prisma.guest.count({ where: { AND: EVENT_DATES.map((d) => ({ eventDates: { some: { eventDate: eventDateToDbDate(d) } } })) } });
  return { total, guests, farmers, checkIns, repeated, recentGuests, recentScans, byDate, bothDays, noShows: Math.max(total - checkIns, 0), attendanceRate: total ? Math.round((checkIns / total) * 100) : 0 };
}

export async function manualCheckInGuest(input: { guestId: string; eventDate: EventDate; userId: string; operationId: string }) {
  return prisma.$transaction(async (tx) => {
    const guest = await tx.guest.findUnique({ where: { id: input.guestId }, include: { eventDates: true, checkIns: { where: { eventDate: eventDateToDbDate(input.eventDate) } } } });
    if (!guest) return { status: "red" as const, message: "Гость не найден" };
    if (guest.status === "BLOCKED") return { status: "red" as const, message: "Билет заблокирован" };
    if (!guest.eventDates.some((d) => dateKey(d.eventDate) === input.eventDate)) return { status: "red" as const, message: "Билет предназначен для другого дня" };
    if (guest.checkIns.length) return { status: "red" as const, message: "Билет уже использован", firstCheckIn: guest.checkIns[0] };
    const checkIn = await tx.checkIn.create({ data: { guestId: guest.id, eventDate: eventDateToDbDate(input.eventDate), scannerUserId: input.userId, mode: "MANUAL", operationId: input.operationId } });
    await tx.auditLog.create({ data: { userId: input.userId, action: "MANUAL_CHECK_IN", entityType: "Guest", entityId: guest.id, after: { eventDate: input.eventDate, checkInId: checkIn.id } } });
    return { status: "green" as const, message: "Ручной проход отмечен", guest, checkIn };
  }).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "red" as const, message: "Билет уже использован" };
    }
    throw error;
  });
}

export async function cancelCheckIn(checkInId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.checkIn.findUnique({ where: { id: checkInId } });
    if (!before) return null;
    await tx.checkIn.delete({ where: { id: checkInId } });
    await tx.auditLog.create({ data: { userId, action: "CANCEL_CHECK_IN", entityType: "CheckIn", entityId: checkInId, before: before as object } });
    return before;
  });
}
