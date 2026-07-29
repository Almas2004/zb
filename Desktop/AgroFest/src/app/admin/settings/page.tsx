import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const settings = await prisma.eventSettings.findFirst();
  return (
    <section className="max-w-3xl rounded-lg bg-white p-6 shadow">
      <h1 className="text-3xl font-black text-[#004F2F]">Настройки мероприятия</h1>
      <div className="mt-4 grid gap-3">
        <p><b>Название:</b> {settings?.eventName || "AgroFest 2026"}</p>
        <p><b>Регистрация:</b> {settings?.registrationOpen ?? true ? "открыта" : "закрыта"}</p>
        <p><b>Публичный URL:</b> {settings?.publicBaseUrl || process.env.APP_URL || "не задан"}</p>
        <p><b>CAPTCHA:</b> {process.env.CAPTCHA_ENABLED === "true" ? "включена переменной окружения" : "выключена"}</p>
      </div>
    </section>
  );
}
