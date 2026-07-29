import { redirect } from "next/navigation";

export default async function CheckInLinkPage({ params }: { params: Promise<{ token: string }> }) {
  await params;
  redirect("/login");
}
