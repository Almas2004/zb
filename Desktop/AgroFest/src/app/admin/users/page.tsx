import { prisma } from "@/lib/prisma";
import { UserCreateForm } from "@/components/UserCreateForm";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <section>
      <h1 className="text-3xl font-black text-[#004F2F]">Пользователи</h1>
      <p className="mt-2 text-neutral-700">Создание новых пользователей SCANNER отключено, так как сканирование больше не используется в рабочем процессе.</p>
      <UserCreateForm />
      <div className="mt-5 grid gap-3">{users.map((user) => <article key={user.id} className="rounded-lg bg-white p-4 shadow"><b>{user.name}</b><p>{user.login} · {user.role} · {user.isActive ? "активен" : "заблокирован"}</p></article>)}</div>
    </section>
  );
}
