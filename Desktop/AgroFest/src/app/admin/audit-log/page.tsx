import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const items = await prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { user: true } });
  return (
    <section>
      <h1 className="text-3xl font-black text-[#004F2F]">Audit log</h1>
      <div className="mt-5 grid gap-3">{items.map((item) => <article key={item.id} className="rounded-lg bg-white p-4 shadow"><b>{item.action}</b><p>{item.entityType} · {item.entityId || ""} · {item.user?.login || "system"} · {item.createdAt.toLocaleString("ru-RU")}</p></article>)}</div>
    </section>
  );
}
