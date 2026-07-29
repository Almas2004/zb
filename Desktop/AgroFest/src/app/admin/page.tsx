import { dashboardStats } from "@/lib/guests";
import { formatAlmatyDateTime } from "@/lib/dates";

export default async function AdminPage() {
  const stats = await dashboardStats();
  const cards = [
    ["Всего регистраций", stats.total],
    ["31 июля зарегистрировано", stats.byDate[0]?.registered || 0],
    ["1 августа зарегистрировано", stats.byDate[1]?.registered || 0],
    ["Оба дня", stats.bothDays],
    ["Пришли 31 июля", stats.byDate[0]?.checkedIn || 0],
    ["Пришли 1 августа", stats.byDate[1]?.checkedIn || 0],
    ["Всего пришедших", stats.checkIns],
    ["Гости", stats.guests],
    ["Фермеры", stats.farmers],
    ["Не пришли", stats.noShows],
    ["Посещаемость", `${stats.attendanceRate}%`]
  ];
  return (
    <section>
      <h1 className="text-3xl font-black text-[#004F2F]">Панель администратора</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => <article key={label} className="rounded-lg bg-white p-5 shadow"><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 text-3xl font-black text-[#004F2F]">{value}</p></article>)}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-black text-[#004F2F]">Последние регистрации</h2>
          <div className="mt-3 grid gap-2">{stats.recentGuests.map((guest) => <p key={guest.id} className="rounded-md bg-[#fff4eb] p-3 font-bold">{guest.registrationNumber} · {guest.firstName} {guest.lastName}</p>)}</div>
        </section>
        <section className="rounded-lg bg-white p-5 shadow">
          <h2 className="text-xl font-black text-[#004F2F]">Последние посещения</h2>
          <div className="mt-3 grid gap-2">{stats.recentScans.map((scan) => <p key={scan.id} className="rounded-md bg-[#fff4eb] p-3 font-bold">{scan.guest.registrationNumber} · {formatAlmatyDateTime(scan.checkedInAt)} · {scan.mode === "SELF_REGISTRATION" ? "автоматически" : scan.mode}</p>)}</div>
        </section>
      </div>
    </section>
  );
}
