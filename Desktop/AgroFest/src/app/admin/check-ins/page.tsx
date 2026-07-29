import { prisma } from "@/lib/prisma";
import { formatAlmatyDateTime } from "@/lib/dates";

export default async function CheckInsPage() {
  const items = await prisma.checkIn.findMany({ take: 100, orderBy: { checkedInAt: "desc" }, include: { guest: true, scannerUser: true } });
  return (
    <section>
      <h1 className="text-3xl font-black text-[#004F2F]">История посещений</h1>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg bg-white p-4 shadow">
            <b>{item.guest.registrationNumber}</b> · {item.guest.firstName} {item.guest.lastName} · {item.eventDate.toISOString().slice(0, 10)} · {formatAlmatyDateTime(item.checkedInAt)} · {item.mode === "SELF_REGISTRATION" ? "самостоятельная регистрация" : item.scannerUser?.name || item.mode}
          </article>
        ))}
      </div>
    </section>
  );
}
