export default function ExportPage() {
  return (
    <section className="max-w-2xl rounded-lg bg-white p-6 shadow">
      <h1 className="text-3xl font-black text-[#004F2F]">Экспорт Excel</h1>
      <p className="mt-3 text-neutral-700">Файл содержит регистрационные данные, выбранные дни, статусы и проходы по датам.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href="/api/admin/export" className="inline-flex rounded-lg bg-[#F15A22] px-5 py-3 font-bold text-white">Все гости</a>
        <a href="/api/admin/export?attendance=checked-in" className="inline-flex rounded-lg bg-[#004F2F] px-5 py-3 font-bold text-white">Только пришедшие</a>
        <a href="/api/admin/export?attendance=no-show" className="inline-flex rounded-lg bg-white px-5 py-3 font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">Не пришедшие</a>
        <a href="/api/admin/export?eventDate=2026-07-31" className="inline-flex rounded-lg bg-white px-5 py-3 font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">31 июля</a>
        <a href="/api/admin/export?eventDate=2026-08-01" className="inline-flex rounded-lg bg-white px-5 py-3 font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">1 августа</a>
        <a href="/api/admin/export?category=GUEST" className="inline-flex rounded-lg bg-white px-5 py-3 font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">Гости</a>
        <a href="/api/admin/export?category=FARMER" className="inline-flex rounded-lg bg-white px-5 py-3 font-bold text-[#004F2F] ring-1 ring-[#004F2F]/20">Фермеры</a>
      </div>
    </section>
  );
}
