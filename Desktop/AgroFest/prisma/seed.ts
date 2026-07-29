import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { hashPassword, randomToken, sha256 } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed is disabled in production");
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "dev-admin-password";

  await prisma.eventSettings.upsert({
    where: { id: "default" },
    create: { id: "default", eventName: "AgroFest 2026", registrationOpen: true, publicBaseUrl: process.env.APP_URL },
    update: {}
  });

  await prisma.user.upsert({
    where: { login: process.env.SEED_ADMIN_LOGIN || "admin" },
    create: { name: "Администратор", login: process.env.SEED_ADMIN_LOGIN || "admin", role: "ADMIN", passwordHash: await hashPassword(adminPassword) },
    update: {}
  });

  const samples = [
    ["AF26-000001", "Алия", "Серикова", "GUEST", ["2026-07-31"]],
    ["AF26-000002", "Ерлан", "Касымов", "FARMER", ["2026-08-01"]],
    ["AF26-000003", "Мария", "Иванова", "GUEST", ["2026-07-31", "2026-08-01"]],
    ["AF26-000004", "Нурлан", "Ахметов", "FARMER", ["2026-07-31"]]
  ] as const;

  for (const sample of samples) {
    const token = randomToken();
    await prisma.guest.upsert({
      where: { registrationNumber: sample[0] },
      create: {
        registrationNumber: sample[0],
        firstName: sample[1],
        lastName: sample[2],
        phone: "+77010000000",
        category: sample[3],
        language: "RU",
        publicTicketToken: randomToken(24),
        qrTokenHash: sha256(token),
        status: sample[0] === "AF26-000004" ? "BLOCKED" : "ACTIVE",
        consentAccepted: true,
        consentAcceptedAt: new Date(),
        source: "seed",
        eventDates: { create: sample[4].map((date) => ({ eventDate: new Date(`${date}T00:00:00.000Z`) })) }
      },
      update: {}
    });
  }

  const first = await prisma.guest.findUnique({ where: { registrationNumber: "AF26-000001" } });
  if (first) {
    await prisma.checkIn.upsert({
      where: { operationId: "seed-used-ticket" },
      create: {
        guestId: first.id,
        eventDate: new Date("2026-07-31T00:00:00.000Z"),
        mode: "SELF_REGISTRATION",
        operationId: "seed-used-ticket",
        metadata: { source: "seed" }
      },
      update: {}
    }).catch(() => undefined);
  }

  const count = await prisma.guest.count();
  await prisma.registrationCounter.upsert({
    where: { id: "guest" },
    create: { id: "guest", value: count },
    update: { value: count }
  });
}

main().finally(() => prisma.$disconnect());
