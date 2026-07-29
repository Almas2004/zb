import { LoginForm } from "@/components/LoginForm";
import { AgroLogo } from "@/components/AgroLogo";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fffaf4] px-4 py-10">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <AgroLogo className="mx-auto h-24 w-60" priority />
        <h1 className="mt-5 text-center text-2xl font-black text-[#004F2F]">Вход для сотрудников</h1>
        <LoginForm />
      </section>
    </main>
  );
}
