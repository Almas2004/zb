import { NextRequest, NextResponse } from "next/server";
import { createGuest } from "@/lib/guests";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`register:${ip}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { guest, alreadyRegistered } = await createGuest(body);
    return NextResponse.json({
      success: true,
      alreadyRegistered,
      registrationNumber: guest.registrationNumber,
      status: "ATTENDED"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать регистрацию";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
