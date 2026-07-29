import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");
  return (
    <div className="min-h-dvh bg-[#fffaf4] md:flex">
      <AdminNav />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
