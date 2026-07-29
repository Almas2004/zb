"use client";

import { useState } from "react";
import { Button } from "./Button";

export function AdminGuestActions({ guestId, status, checkIns }: { guestId: string; status: string; checkIns: Array<{ id: string; eventDate: string }> }) {
  const [message, setMessage] = useState("");

  async function patch(nextStatus: "ACTIVE" | "BLOCKED") {
    const response = await fetch(`/api/admin/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    setMessage(response.ok ? "Статус обновлён" : "Ошибка обновления статуса");
    if (response.ok) window.location.reload();
  }

  async function manual(eventDate: "2026-07-31" | "2026-08-01") {
    const response = await fetch("/api/admin/check-ins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, eventDate })
    });
    const json = await response.json();
    setMessage(json.message || json.error || "Готово");
    if (response.ok) window.location.reload();
  }

  async function cancel(id: string) {
    const response = await fetch(`/api/admin/check-ins?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setMessage(response.ok ? "Посещение отменено" : "Ошибка отмены");
    if (response.ok) window.location.reload();
  }

  return (
    <div className="mt-5 grid gap-3">
      <div className="flex flex-wrap gap-3">
        {status === "BLOCKED" ? <Button onClick={() => patch("ACTIVE")} variant="green">Разблокировать регистрацию</Button> : <Button onClick={() => patch("BLOCKED")} variant="danger">Заблокировать регистрацию</Button>}
        <Button onClick={() => manual("2026-07-31")} variant="ghost">Отметить 31 июля</Button>
        <Button onClick={() => manual("2026-08-01")} variant="ghost">Отметить 1 августа</Button>
      </div>
      {checkIns.length > 0 && (
        <div className="grid gap-2">
          {checkIns.map((item) => <Button key={item.id} onClick={() => cancel(item.id)} variant="ghost">Отменить посещение {item.eventDate}</Button>)}
        </div>
      )}
      {message && <p className="rounded-lg bg-[#fff4eb] p-3 font-bold text-[#004F2F]">{message}</p>}
    </div>
  );
}
