import { prisma } from "@/lib/prisma";

export default async function ScannersPage() {
  const devices = await prisma.scannerDevice.findMany({ orderBy: { createdAt: "desc" }, include: { user: true } });
  return (
    <section>
      <h1 className="text-3xl font-black text-[#004F2F]">Устройства сканеров</h1>
      <div className="mt-5 grid gap-3">{devices.map((device) => <article key={device.id} className="rounded-lg bg-white p-4 shadow"><b>{device.name}</b><p className="text-sm text-neutral-600">{device.user?.name || "Без пользователя"} · {device.lastSeenAt?.toLocaleString("ru-RU") || "нет активности"}</p></article>)}</div>
    </section>
  );
}
