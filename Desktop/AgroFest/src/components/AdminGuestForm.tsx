"use client";

import { useState } from "react";
import { Button } from "./Button";

export function AdminGuestForm() {
  const [createdCode, setCreatedCode] = useState<string>();
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const dates = [data.day1 && "2026-07-31", data.day2 && "2026-08-01"].filter(Boolean);
    const response = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, dates, consentAccepted: true, language: "RU", website: "" })
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || "Ошибка создания");
      return;
    }
    setCreatedCode(json.registrationNumber);
    form.reset();
  }

  return (
    <form onSubmit={submit} className="mt-5 grid max-w-2xl gap-4 rounded-lg bg-white p-5 shadow">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="firstName" className="rounded-lg border px-4 py-3" placeholder="Имя" />
        <input name="lastName" className="rounded-lg border px-4 py-3" placeholder="Фамилия" />
      </div>
      <input name="phone" type="tel" inputMode="tel" autoComplete="tel" className="rounded-lg border px-4 py-3" placeholder="Например: +7 705 571 55 06" />
      <select name="category" className="rounded-lg border px-4 py-3"><option value="GUEST">Гость</option><option value="FARMER">Фермер</option></select>
      <div className="flex gap-4"><label><input name="day1" type="checkbox" defaultChecked /> 31 июля</label><label><input name="day2" type="checkbox" /> 1 августа</label></div>
      {error && <p className="text-red-700">{error}</p>}
      {createdCode && <p className="rounded-lg bg-[#fff4eb] p-3 font-bold text-[#004F2F]">Создана регистрация: {createdCode}</p>}
      <Button>Создать регистрацию</Button>
    </form>
  );
}
