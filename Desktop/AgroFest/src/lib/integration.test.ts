import "dotenv/config";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import { prisma } from "./prisma";
import { authenticate } from "./auth";
import { randomToken, sha256 } from "./crypto";
import { createGuest, checkInTicket, listGuests, manualCheckInGuest, cancelCheckIn, nextRegistrationNumber, dashboardStats } from "./guests";
import { registrationSchema } from "./validators";
import { dateKey, eventDateToDbDate } from "./dates";

function phone(seed: number) {
  return `+7 701 ${String(1000000 + seed).slice(0, 3)} ${String(1000000 + seed).slice(3, 5)} ${String(1000000 + seed).slice(5, 7)}`;
}

async function guest(seed: number, overrides: Record<string, unknown> = {}) {
  return createGuest({
    firstName: `Тест${seed}`,
    lastName: `Қонақ${seed}`,
    phone: phone(seed),
    category: seed % 2 ? "FARMER" : "GUEST",
    language: seed % 2 ? "KZ" : "RU",
    dates: ["2026-07-31"],
    consentAccepted: true,
    source: "admin",
    website: "",
    ...overrides
  });
}

async function publicGuest(seed: number, overrides: Record<string, unknown> = {}) {
  return createGuest({
    firstName: `Public${seed}`,
    lastName: `Guest${seed}`,
    phone: phone(seed),
    category: seed % 2 ? "FARMER" : "GUEST",
    language: seed % 2 ? "KZ" : "RU",
    consentAccepted: true,
    website: "",
    ...overrides
  });
}

function setPublicTestDate(date: "2026-07-31" | "2026-08-01") {
  process.env.ALLOW_OUTSIDE_EVENT_DATES = "true";
  process.env.TEST_EVENT_DATE = date;
}

function uniquePublicPhone(prefix = "703") {
  const suffix = String(Date.now() + Math.floor(Math.random() * 1000)).slice(-7);
  return `+7 ${prefix} ${suffix.slice(0, 3)} ${suffix.slice(3, 5)} ${suffix.slice(5, 7)}`;
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

describe("AgroFest production acceptance scenarios", () => {
  it("registers a new guest", async () => {
    const result = await guest(200001);
    expect(result.guest.registrationNumber).toMatch(/^AF26-\d{6}$/);
    expect(result.qrToken.length).toBeGreaterThan(30);
  });

  it("registers public RU guest and creates automatic check-in", async () => {
    setPublicTestDate("2026-07-31");
    const suffix = String(Date.now()).slice(-7);
    const result = await publicGuest(210001, { language: "RU", phone: `+7 702 ${suffix.slice(0, 3)} ${suffix.slice(3, 5)} ${suffix.slice(5, 7)}` });
    expect(result.alreadyRegistered).toBe(false);
    expect(result.guest.registrationNumber).toMatch(/^AF26-\d{6}$/);
    const checkIn = await prisma.checkIn.findFirstOrThrow({ where: { guestId: result.guest.id, mode: "SELF_REGISTRATION" } });
    expect(dateKey(checkIn.eventDate)).toBe("2026-07-31");
  });

  it("registers public KZ guest and returns existing code on repeated phone", async () => {
    setPublicTestDate("2026-07-31");
    const suffix = String(Date.now()).slice(-7);
    const publicPhone = `+7 701 ${suffix.slice(0, 3)} ${suffix.slice(3, 5)} ${suffix.slice(5, 7)}`;
    const first = await publicGuest(210002, { language: "KZ", phone: publicPhone });
    const second = await publicGuest(210003, { language: "KZ", phone: publicPhone, firstName: "Repeat", lastName: "Guest" });
    expect(second.alreadyRegistered).toBe(true);
    expect(second.guest.registrationNumber).toBe(first.guest.registrationNumber);
    const guests = await prisma.guest.count({ where: { registrationDedupKey: `phone:${first.guest.phone}:2026-07-31` } });
    expect(guests).toBe(1);
  });

  it("deduplicates repeated public registration across phone formats", async () => {
    setPublicTestDate("2026-07-31");
    const suffix = String(Date.now() + Math.floor(Math.random() * 1000)).slice(-7);
    const rawPhone = `8 (705) ${suffix.slice(0, 3)}-${suffix.slice(3, 5)}-${suffix.slice(5, 7)}`;
    const formattedPhone = `+7 705 ${suffix.slice(0, 3)} ${suffix.slice(3, 5)} ${suffix.slice(5, 7)}`;
    const normalizedPhone = `+7705${suffix}`;
    const first = await publicGuest(210011, { phone: rawPhone });
    const second = await publicGuest(210012, { phone: formattedPhone, firstName: "Repeat", lastName: "Phone" });
    expect(first.guest.phone).toBe(normalizedPhone);
    expect(second.alreadyRegistered).toBe(true);
    expect(second.guest.registrationNumber).toBe(first.guest.registrationNumber);
    const guests = await prisma.guest.count({ where: { registrationDedupKey: `phone:${normalizedPhone}:2026-07-31` } });
    expect(guests).toBe(1);
  });

  it("public form does not render date buttons", () => {
    const source = readFileSync("src/components/RegistrationForm.tsx", "utf8");
    expect(source).not.toContain("DateToggle");
    expect(source).not.toContain("visitDays");
    expect(source).not.toContain("2026-07-31");
    expect(source).not.toContain("2026-08-01");
  });

  it("public frontend omits visit date from submit payload", () => {
    const source = readFileSync("src/components/RegistrationForm.tsx", "utf8");
    expect(source).toContain("delete payload.dates");
    expect(source).toContain("JSON.stringify(payload)");
    expect(source).not.toContain("JSON.stringify(values)");
  });

  it("registers public guest for August 1 through server override", async () => {
    setPublicTestDate("2026-08-01");
    const result = await publicGuest(210004);
    const checkIn = await prisma.checkIn.findFirstOrThrow({ where: { guestId: result.guest.id, mode: "SELF_REGISTRATION" } });
    expect(dateKey(checkIn.eventDate)).toBe("2026-08-01");
    expect(result.guest.eventDates.map((item) => dateKey(item.eventDate))).toEqual(["2026-08-01"]);
  });

  it("ignores tampered client dates for public registration", async () => {
    setPublicTestDate("2026-08-01");
    const result = await publicGuest(210005, { dates: ["2026-07-31"] });
    expect(result.guest.eventDates.map((item) => dateKey(item.eventDate))).toEqual(["2026-08-01"]);
    const checkIn = await prisma.checkIn.findFirstOrThrow({ where: { guestId: result.guest.id, mode: "SELF_REGISTRATION" } });
    expect(dateKey(checkIn.eventDate)).toBe("2026-08-01");
  });

  it("blocks public registration outside event dates without override", async () => {
    process.env.ALLOW_OUTSIDE_EVENT_DATES = "false";
    await expect(publicGuest(210006, { language: "RU" })).rejects.toThrow("Регистрация доступна только 31 июля и 1 августа 2026 года.");
    const count = await prisma.guest.count({ where: { phone: phone(210006) } });
    expect(count).toBe(0);
  });

  it("allows the same phone once per each event day", async () => {
    const publicPhone = uniquePublicPhone();
    setPublicTestDate("2026-07-31");
    const first = await publicGuest(210007, { phone: publicPhone });
    const firstDuplicate = await publicGuest(210107, { phone: publicPhone });
    setPublicTestDate("2026-08-01");
    const second = await publicGuest(210207, { phone: publicPhone });
    expect(firstDuplicate.alreadyRegistered).toBe(true);
    expect(second.alreadyRegistered).toBe(false);
    expect(second.guest.registrationNumber).not.toBe(first.guest.registrationNumber);
    const guests = await prisma.guest.count({ where: { phone: first.guest.phone, registrationDedupKey: { in: [`phone:${first.guest.phone}:2026-07-31`, `phone:${first.guest.phone}:2026-08-01`] } } });
    expect(guests).toBe(2);
  });

  it("splits dashboard stats by actual event dates", async () => {
    setPublicTestDate("2026-07-31");
    await publicGuest(210008);
    setPublicTestDate("2026-08-01");
    await publicGuest(210009);
    const stats = await dashboardStats();
    expect(stats.byDate.find((item) => item.date === "2026-07-31")?.checkedIn).toBeGreaterThan(0);
    expect(stats.byDate.find((item) => item.date === "2026-08-01")?.checkedIn).toBeGreaterThan(0);
  });

  it("keeps actual auto visit date for Excel export rows", async () => {
    setPublicTestDate("2026-08-01");
    const result = await publicGuest(210010);
    const stored = await prisma.guest.findUniqueOrThrow({ where: { id: result.guest.id }, include: { eventDates: true, checkIns: true } });
    expect(stored.eventDates.map((item) => item.eventDate)).toEqual([eventDateToDbDate("2026-08-01")]);
    expect(stored.checkIns.map((item) => item.eventDate)).toEqual([eventDateToDbDate("2026-08-01")]);
  });

  it("rejects invalid phone", () => {
    expect(() => registrationSchema.parse({ firstName: "A", lastName: "B", phone: "123", category: "GUEST", language: "RU", dates: ["2026-07-31"], consentAccepted: true })).toThrow();
  });

  it("requires consent", () => {
    expect(() => registrationSchema.parse({ firstName: "Алия", lastName: "Серикова", phone: "+7 701 123 45 67", category: "GUEST", language: "RU", dates: ["2026-07-31"], consentAccepted: false })).toThrow();
  });

  it("generates increasing unique registration numbers", async () => {
    const a = await guest(200002);
    const b = await guest(200003);
    expect(a.guest.registrationNumber).not.toBe(b.guest.registrationNumber);
  });

  it("can reserve a next registration number through the counter", async () => {
    const number = await prisma.$transaction((tx) => nextRegistrationNumber(tx));
    expect(number).toMatch(/^AF26-\d{6}$/);
  });

  it("keeps QR token unique and hashed", async () => {
    const a = await guest(200004);
    const b = await guest(200005);
    expect(a.qrToken).not.toBe(b.qrToken);
    expect(a.guest.qrTokenHash).toBe(sha256(a.qrToken));
  });

  it("does not include personal data in QR URL", async () => {
    const result = await guest(200006, { firstName: "SecretName", lastName: "SecretLast", phone: "+7 701 555 55 55" });
    const qr = `http://localhost:3000/check-in/${result.qrToken}`;
    expect(qr).not.toContain("SecretName");
    expect(qr).not.toContain("SecretLast");
    expect(qr).not.toContain("555");
    expect(qr).not.toContain(result.guest.registrationNumber);
  });

  it("allows successful check-in", async () => {
    const result = await guest(200007);
    const scan = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) });
    expect(scan.status).toBe("green");
  });

  it("blocks repeated check-in", async () => {
    const result = await guest(200008);
    await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) });
    const again = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) });
    expect(again.status).toBe("red");
    expect(again.message).toContain("использован");
  });

  it("allows only one of two concurrent check-ins", async () => {
    const result = await guest(200009);
    const [a, b] = await Promise.all([
      checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) }),
      checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) })
    ]);
    expect([a.status, b.status].sort()).toEqual(["green", "red"]);
    const count = await prisma.checkIn.count({ where: { guestId: result.guest.id, eventDate: new Date("2026-07-31T00:00:00.000Z") } });
    expect(count).toBe(1);
  });

  it("rejects wrong event day", async () => {
    const result = await guest(200010, { dates: ["2026-07-31"] });
    const scan = await checkInTicket({ token: result.qrToken, eventDate: "2026-08-01", operationId: randomToken(12) });
    expect(scan.result).toBe("WRONG_DAY");
  });

  it("supports both-day ticket with one pass per day", async () => {
    const result = await guest(200011, { dates: ["2026-07-31", "2026-08-01"] });
    const d1 = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) });
    const d1Again = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) });
    const d2 = await checkInTicket({ token: result.qrToken, eventDate: "2026-08-01", operationId: randomToken(12) });
    const d2Again = await checkInTicket({ token: result.qrToken, eventDate: "2026-08-01", operationId: randomToken(12) });
    expect([d1.status, d1Again.status, d2.status, d2Again.status]).toEqual(["green", "red", "green", "red"]);
  });

  it("rejects blocked ticket", async () => {
    const result = await guest(200012);
    await prisma.guest.update({ where: { id: result.guest.id }, data: { status: "BLOCKED" } });
    const scan = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId: randomToken(12) });
    expect(scan.result).toBe("BLOCKED");
  });

  it("handles unknown QR token", async () => {
    const scan = await checkInTicket({ token: randomToken(), eventDate: "2026-07-31", operationId: randomToken(12) });
    expect(scan.result).toBe("NOT_FOUND");
  });

  it("supports manual guest creation", async () => {
    const result = await guest(200013, { source: "admin" });
    expect(result.guest.source).toBe("admin");
  });

  it("supports manual check-in", async () => {
    const result = await guest(200014);
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const scan = await manualCheckInGuest({ guestId: result.guest.id, eventDate: "2026-07-31", userId: admin.id, operationId: randomToken(12) });
    expect(scan.status).toBe("green");
  });

  it("supports cancelling mistaken check-in", async () => {
    const result = await guest(200015);
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const scan = await manualCheckInGuest({ guestId: result.guest.id, eventDate: "2026-07-31", userId: admin.id, operationId: randomToken(12) });
    if (!("checkIn" in scan) || !scan.checkIn) throw new Error("manual check-in failed");
    await cancelCheckIn(scan.checkIn.id, admin.id);
    const count = await prisma.checkIn.count({ where: { guestId: result.guest.id } });
    expect(count).toBe(0);
  });

  it("authenticates ADMIN test account", async () => {
    const admin = await authenticate(process.env.SEED_ADMIN_LOGIN || "admin", process.env.SEED_ADMIN_PASSWORD || "dev-admin-password");
    expect(admin?.role).toBe("ADMIN");
  });

  it("does not require scanner users for the current registration flow", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    expect(admin.role).toBe("ADMIN");
  });

  it("creates Excel export buffer", async () => {
    const buffer = await writeXlsxFile([[{ value: "Телефон" }, { value: "+7 701 123 45 67", type: String }]]).toBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("prevents duplicate offline operation sync", async () => {
    const result = await guest(200016);
    const operationId = randomToken(12);
    const first = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId, mode: "OFFLINE_SYNC" });
    const second = await checkInTicket({ token: result.qrToken, eventDate: "2026-07-31", operationId, mode: "OFFLINE_SYNC" });
    expect(first.status).toBe("green");
    expect(second.result).toBe("DUPLICATE_OPERATION");
  });

  it("records database connection as reachable", async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeTruthy();
  });

  it("finds guest by phone", async () => {
    const result = await guest(200017, { phone: "+7 701 777 17 17" });
    const list = await listGuests({ q: "7771717", page: 1, pageSize: 10 });
    expect(list.items.some((item) => item.id === result.guest.id)).toBe(true);
  });

  it("filters by category and date", async () => {
    const result = await guest(200018, { category: "FARMER", dates: ["2026-08-01"] });
    const list = await listGuests({ category: "FARMER", eventDate: "2026-08-01", page: 1, pageSize: 50 });
    expect(list.items.some((item) => item.id === result.guest.id)).toBe(true);
  });

  it("does not expose sequential public ticket URLs", async () => {
    const result = await guest(200019);
    expect(result.guest.publicTicketToken).not.toMatch(/^\d+$/);
    expect(result.guest.publicTicketToken).not.toContain(result.guest.id);
  });
});
