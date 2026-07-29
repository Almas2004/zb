import Link from "next/link";
import { AgroLogo } from "./AgroLogo";

const links = [
  ["/admin", "Статистика"],
  ["/admin/guests", "Гости"],
  ["/admin/guests/new", "Добавить"],
  ["/admin/check-ins", "Посещения"],
  ["/admin/users", "Пользователи"],
  ["/admin/export", "Экспорт"],
  ["/admin/promotional-qr", "Рекламный QR"],
  ["/admin/settings", "Настройки"],
  ["/admin/audit-log", "Audit log"]
];

export function AdminNav() {
  return (
    <aside className="bg-[#004F2F] p-4 text-white md:min-h-dvh md:w-64">
      <AgroLogo className="h-20 w-48" priority />
      <nav className="mt-6 grid gap-1">
        {links.map(([href, label]) => (
          <Link key={href} className="focus-ring rounded-lg px-3 py-2 font-bold hover:bg-white/10" href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
