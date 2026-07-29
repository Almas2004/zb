"use client";

import { useState } from "react";
import { ScannerShell } from "./ScannerShell";

export function ManualScanner() {
  const [token, setToken] = useState<string>();
  return (
    <main>
      {!token && (
        <section className="mx-auto max-w-xl bg-[#fffaf4] px-4 py-8">
          <h1 className="text-2xl font-black text-[#004F2F]">Ручная проверка</h1>
          <p className="mt-2 text-neutral-700">Можно ввести номер билета, например AF26-000001, QR-ссылку или токен.</p>
          <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("token")?.toString().trim(); if (value) setToken(value); }}>
            <input name="token" className="focus-ring rounded-lg border border-neutral-300 px-4 py-3" placeholder="AF26-000001" />
            <button className="focus-ring rounded-lg bg-[#F15A22] px-5 py-3 font-bold text-white">Проверить</button>
          </form>
        </section>
      )}
      {token && <ScannerShell initialToken={token} />}
    </main>
  );
}
