"use client";

import { useState } from "react";
import { Button } from "./Button";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: formData.get("login"), password: formData.get("password") })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Ошибка входа");
      return;
    }
    window.location.href = data.role === "ADMIN" ? "/admin" : "/login";
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <label><span className="mb-2 block font-bold text-[#004F2F]">Логин</span><input name="login" className="focus-ring w-full rounded-lg border border-neutral-300 px-4 py-3" /></label>
      <label><span className="mb-2 block font-bold text-[#004F2F]">Пароль</span><input name="password" type="password" className="focus-ring w-full rounded-lg border border-neutral-300 px-4 py-3" /></label>
      {error && <p className="rounded-lg bg-red-50 p-3 font-bold text-red-800">{error}</p>}
      <Button disabled={loading}>{loading ? "Входим..." : "Войти"}</Button>
    </form>
  );
}
