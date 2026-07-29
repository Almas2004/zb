import { RegistrationForm } from "@/components/RegistrationForm";
import { AgroLogo } from "@/components/AgroLogo";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#fffaf4]">
      <section className="brand-gradient px-4 pb-16 pt-6 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <AgroLogo className="h-20 w-48" priority />
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">31.07-01.08</span>
        </div>
        <div className="mx-auto mt-8 max-w-5xl">
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-6xl">AgroFest 2026</h1>
          <p className="mt-4 max-w-xl text-lg font-medium text-white/90">
            Регистрация гостей и фермеров. Заполните форму, получите уникальный код и сразу отметьтесь как пришедший участник.
          </p>
        </div>
      </section>
      <section className="-mt-10 px-4 pb-12">
        <RegistrationForm />
      </section>
    </main>
  );
}
