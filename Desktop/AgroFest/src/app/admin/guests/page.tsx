import Link from "next/link";
import { listGuests } from "@/lib/guests";
import { formatAlmatyDateTime } from "@/lib/dates";
import { guestFiltersSchema } from "@/lib/validators";

function sourceLabel(source?: string | null) {
  if (source === "self-registration") return "Самостоятельная регистрация";
  if (source === "admin") return "Админ";
  return source || "";
}

export default async function GuestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = guestFiltersSchema.parse(await searchParams);
  const { items, total } = await listGuests(filters);
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-[#004F2F]">Гости</h1>
        <Link href="/admin/guests/new" className="rounded-lg bg-[#F15A22] px-5 py-3 font-bold text-white">Добавить гостя</Link>
      </div>
      <form className="mt-5 grid gap-3 rounded-lg bg-white p-4 shadow md:grid-cols-5">
        <input name="q" defaultValue={filters.q} className="rounded-lg border px-3 py-2 md:col-span-2" placeholder="Поиск" />
        <select name="category" defaultValue={filters.category || ""} className="rounded-lg border px-3 py-2"><option value="">Категория</option><option value="GUEST">Гость</option><option value="FARMER">Фермер</option></select>
        <select name="eventDate" defaultValue={filters.eventDate || ""} className="rounded-lg border px-3 py-2"><option value="">День</option><option value="2026-07-31">31 июля</option><option value="2026-08-01">1 августа</option></select>
        <button className="rounded-lg bg-[#004F2F] px-4 py-2 font-bold text-white">Найти</button>
      </form>
      <div className="mt-5 overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="bg-[#004F2F] text-left text-white">
            <tr>{["Код", "Имя", "Телефон", "Категория", "Дни", "Регистрация", "Посещение", "Статус", "Источник"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((guest) => {
              const checkIn = guest.checkIns[0];
              return (
                <tr key={guest.id} className="border-b">
                  <td className="p-3 font-bold"><Link className="text-[#004F2F] underline" href={`/admin/guests/${guest.id}`}>{guest.registrationNumber}</Link></td>
                  <td className="p-3">{guest.firstName} {guest.lastName}</td>
                  <td className="p-3">{guest.phone}</td>
                  <td className="p-3">{guest.category === "FARMER" ? "Фермер" : "Гость"}</td>
                  <td className="p-3">{guest.eventDates.map((d) => d.eventDate.toISOString().slice(0, 10)).join(", ")}</td>
                  <td className="p-3">{formatAlmatyDateTime(guest.createdAt)}</td>
                  <td className="p-3">{checkIn ? formatAlmatyDateTime(checkIn.checkedInAt) : ""}</td>
                  <td className="p-3 font-bold">{checkIn ? "Пришёл" : "Не пришёл"}</td>
                  <td className="p-3">{sourceLabel(guest.source)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-neutral-600">Показано {items.length} из {total}</p>
    </section>
  );
}
