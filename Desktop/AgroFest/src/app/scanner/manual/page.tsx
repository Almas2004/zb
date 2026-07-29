import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ManualPage() {
  const user = await getSession();
  redirect(user?.role === "ADMIN" ? "/admin" : "/login");
}
