import { NextResponse } from "next/server";
import { authenticate, createSession, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте логин и пароль" }, { status: 400 });
  }
  const user = await authenticate(parsed.data.login, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  await setSessionCookie(await createSession(user.id, user.role));
  return NextResponse.json({ ok: true, role: user.role });
}
