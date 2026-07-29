import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { randomToken, sha256 } from "../src/lib/crypto";
import { eventDateToDbDate } from "../src/lib/dates";

const total = Number(process.env.GENERATE_GUESTS_COUNT || process.argv[2] || 10000);

async function main() {
  const start = Date.now();
  for (let i = 0; i < total; i += 1) {
    const token = randomToken();
    const number = await prisma.$transaction(async (tx) => {
      const counter = await tx.registrationCounter.upsert({ where: { id: "guest" }, create: { id: "guest", value: 1 }, update: { value: { increment: 1 } } });
      const registrationNumber = `AF26-${String(counter.value).padStart(6, "0")}`;
      await tx.guest.create({
        data: {
          registrationNumber,
          firstName: `Тест${i}`,
          lastName: `Гость${i}`,
          phone: `+7701${String(1000000 + i).slice(0, 7)}`,
          category: i % 2 ? "FARMER" : "GUEST",
          language: i % 3 ? "RU" : "KZ",
          publicTicketToken: randomToken(24),
          qrTokenHash: sha256(token),
          consentAccepted: true,
          consentAcceptedAt: new Date(),
          source: "load-seed",
          eventDates: { create: i % 3 === 0 ? [{ eventDate: eventDateToDbDate("2026-07-31") }, { eventDate: eventDateToDbDate("2026-08-01") }] : [{ eventDate: eventDateToDbDate(i % 2 ? "2026-08-01" : "2026-07-31") }] }
        }
      });
      return registrationNumber;
    });
    if ((i + 1) % 1000 === 0) console.log(`created ${i + 1}/${total}, last ${number}`);
  }
  console.log(`done ${total} guests in ${Date.now() - start}ms`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
