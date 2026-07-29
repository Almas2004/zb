import { LinkButton } from "@/components/Button";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { AgroLogo } from "@/components/AgroLogo";
import { dictionaries, type Locale } from "@/lib/i18n";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ code?: string; lang?: string; already?: string }> }) {
  const params = await searchParams;
  const locale: Locale = params.lang === "KZ" ? "KZ" : "RU";
  const t = dictionaries[locale];
  const code = params.code || "AF26-000000";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fffaf4] px-4 py-10">
      <section className="w-full max-w-lg rounded-lg bg-white p-7 text-center shadow-2xl">
        <AgroLogo className="mx-auto h-28 w-64" priority />
        <h1 className="mt-4 text-3xl font-black text-[#004F2F]">{t.successTitle}</h1>
        {params.already === "1" && <p className="mt-3 rounded-lg bg-[#fff4eb] p-3 font-bold text-[#004F2F]">{t.duplicateNotice}</p>}
        <p className="mt-5 text-neutral-600">{t.uniqueCodeLabel}</p>
        <div className="mt-2 rounded-lg border-2 border-[#004F2F] bg-[#fffaf4] px-4 py-5 text-4xl font-black tracking-normal text-[#004F2F]">
          {code}
        </div>
        <p className="mt-4 text-neutral-700">{t.successText}</p>
        <div className="mt-6 grid gap-3">
          <CopyCodeButton code={code} label={t.copyCode} copiedLabel={t.copied} />
          <LinkButton href="/" variant="ghost" className="w-full">
            {t.registerAnother}
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
