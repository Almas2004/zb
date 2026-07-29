import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuestForAdmin } from "@/lib/guests";
import { formatAlmatyDateTime } from "@/lib/dates";
import { AdminGuestActions } from "@/components/AdminGuestActions";

function sourceLabel(source?: string | null) {
  if (source === "self-registration") return "Самостоятельная регистрация";
  if (source === "admin") return "Админ";
  return source || "";
}

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guest = await findGuestForAdmin(id);
  if (!guest) notFound();
  const firstCheckIn = guest.checkIns[0];

  return (
    <section>
      <Link href="/admin/guests" className="font-bold text-[#004F2F] underline">Назад к списку</Link>
      <h1 className="mt-3 text-3xl font-black text-[#004F2F]">{guest.registrationNumber}</h1>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-black">Информация</h2>
          <p className="mt-3"><b>ФИО:</b> {guest.firstName} {guest.lastName}</p>
          <p><b>Телефон:</b> {guest.phone}</p>
          <p><b>Категория:</b> {guest.category === "FARMER" ? "Фермер" : "Гость"}</p>
          <p><b>Статус:</b> {firstCheckIn ? "Пришёл" : "Не пришёл"}</p>
          <p><b>Источник:</b> {sourceLabel(guest.source)}</p>
          <p><b>Создан:</b> {formatAlmatyDateTime(guest.createdAt)}</p>
          <p><b>Дни:</b> {guest.eventDates.map((d) => d.eventDate.toISOString().slice(0, 10)).join(", ")}</p>
          <AdminGuestActions guestId={guest.id} status={guest.status} checkIns={guest.checkIns.map((c) => ({ id: c.id, eventDate: c.eventDate.toISOString().slice(0, 10) }))} />
        </article>
        <article className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-black">История посещений</h2>
          <div className="mt-3 grid gap-2">
            {guest.checkIns.map((c) => (
              <p key={c.id} className="rounded-md bg-[#fff4eb] p-3">
                {c.eventDate.toISOString().slice(0, 10)} · {formatAlmatyDateTime(c.checkedInAt)} · {c.mode === "SELF_REGISTRATION" ? "Автоматически при регистрации" : c.mode}
              </p>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
