"use client";

import { Button } from "./Button";

export function UserCreateForm() {
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, role: "ADMIN" }) });
    if (response.ok) window.location.reload();
    else alert("Не удалось создать администратора");
  }
  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 rounded-lg bg-white p-4 shadow md:grid-cols-4">
      <input name="name" className="rounded-lg border px-3 py-2" placeholder="Имя" />
      <input name="login" className="rounded-lg border px-3 py-2" placeholder="Логин" />
      <input name="password" type="password" className="rounded-lg border px-3 py-2" placeholder="Пароль" />
      <Button>Создать администратора</Button>
    </form>
  );
}
