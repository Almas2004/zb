"use client";

import { useEffect, useState } from "react";
import { listOperations, syncOperations, type OfflineOperation } from "@/lib/offline-queue";
import { Button, LinkButton } from "./Button";

export function ScannerHistory() {
  const [items, setItems] = useState<OfflineOperation[]>([]);
  const refresh = () => listOperations().then(setItems);
  useEffect(() => { void refresh(); }, []);
  return (
    <main className="min-h-dvh bg-[#fffaf4] px-4 py-8">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-black text-[#004F2F]">Отложенные проверки</h1>
        <p className="mt-2 text-neutral-700">Эти операции не подтверждали вход. Они отправятся на сервер после восстановления связи.</p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => syncOperations().then(refresh)} variant="green">Синхронизировать</Button>
          <LinkButton href="/scanner" variant="ghost">К сканеру</LinkButton>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item) => <article key={item.id} className="rounded-lg bg-white p-4 shadow"><p className="font-bold">{item.eventDate}</p><p className="break-all text-sm text-neutral-600">{item.operationId}</p><p className="text-sm">{item.createdAt}</p>{item.lastSyncResult && <p className="mt-2 rounded-md bg-yellow-100 p-2 font-bold text-yellow-900">{item.lastSyncResult}</p>}</article>)}
          {!items.length && <p className="rounded-lg bg-white p-4 text-neutral-600 shadow">Очередь пуста.</p>}
        </div>
      </section>
    </main>
  );
}
