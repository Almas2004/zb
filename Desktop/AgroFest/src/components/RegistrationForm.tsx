"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registrationSchema } from "@/lib/validators";
import { dictionaries, type Locale } from "@/lib/i18n";
import { Button } from "./Button";

type FormValues = Omit<z.input<typeof registrationSchema>, "consentAccepted"> & { consentAccepted: boolean };

export function RegistrationForm() {
  const [locale, setLocale] = useState<Locale>("RU");
  const [serverError, setServerError] = useState("");
  const t = dictionaries[locale];
  const form = useForm<FormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "+7 7",
      category: "GUEST",
      language: locale,
      consentAccepted: false,
      website: ""
    }
  });

  useEffect(() => {
    const saved = localStorage.getItem("agrofest_locale") as Locale | null;
    if (saved === "RU" || saved === "KZ") {
      setLocale(saved);
      form.setValue("language", saved);
    }
  }, [form]);

  function changeLocale(next: Locale) {
    setLocale(next);
    form.setValue("language", next);
    localStorage.setItem("agrofest_locale", next);
  }

  async function onSubmit(values: FormValues) {
    setServerError("");
    const payload = { ...values };
    delete payload.dates;
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      setServerError(data.error || "Ошибка регистрации");
      return;
    }
    const params = new URLSearchParams({
      code: data.registrationNumber,
      lang: locale,
      already: data.alreadyRegistered ? "1" : "0"
    });
    window.location.href = `/success?${params.toString()}`;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#004F2F]">{t.title}</h2>
          <p className="mt-1 text-neutral-600">{t.subtitle}</p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 p-1">
          <button type="button" onClick={() => changeLocale("RU")} className={`focus-ring rounded-md px-3 py-2 font-bold ${locale === "RU" ? "bg-[#004F2F] text-white" : "text-[#004F2F]"}`}>RU</button>
          <button type="button" onClick={() => changeLocale("KZ")} className={`focus-ring rounded-md px-3 py-2 font-bold ${locale === "KZ" ? "bg-[#004F2F] text-white" : "text-[#004F2F]"}`}>KZ</button>
        </div>
      </div>

      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...form.register("website")} />
      <input type="hidden" {...form.register("language")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.firstName} error={form.formState.errors.firstName?.message}><input className="focus-ring w-full rounded-lg border border-neutral-300 px-4 py-3" {...form.register("firstName")} /></Field>
        <Field label={t.lastName} error={form.formState.errors.lastName?.message}><input className="focus-ring w-full rounded-lg border border-neutral-300 px-4 py-3" {...form.register("lastName")} /></Field>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t.phone} error={form.formState.errors.phone?.message}><input inputMode="tel" className="focus-ring w-full rounded-lg border border-neutral-300 px-4 py-3" {...form.register("phone")} /></Field>
        <Field label={t.category} error={form.formState.errors.category?.message}>
          <select className="focus-ring w-full rounded-lg border border-neutral-300 px-4 py-3" {...form.register("category")}>
            <option value="GUEST">{t.guest}</option>
            <option value="FARMER">{t.farmer}</option>
          </select>
        </Field>
      </div>

      <label className="mt-5 flex gap-3 rounded-lg bg-[#fff4eb] p-4 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" {...form.register("consentAccepted")} />
        <span>{t.consent}. <a className="font-bold text-[#004F2F] underline" href="/privacy" target="_blank">{t.privacy}</a></span>
      </label>
      {form.formState.errors.consentAccepted?.message && <p className="mt-2 text-sm text-red-700">{String(form.formState.errors.consentAccepted.message)}</p>}
      {serverError && <p className="mt-4 rounded-lg bg-red-50 p-3 font-bold text-red-800">{serverError}</p>}
      <Button disabled={form.formState.isSubmitting} className="mt-6 w-full">
        {form.formState.isSubmitting ? t.loading : t.submit}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block font-bold text-[#004F2F]">{label}</span>{children}{error && <span className="mt-1 block text-sm text-red-700">{error}</span>}</label>;
}
