import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { cancelCheckIn, manualCheckInGuest } from "@/lib/guests";
import { z } from "zod";

const manualSchema = z.object({
  guestId: z.string().min(1),
  eventDate: z.enum(["2026-07-31", "2026-08-01"])
});

export async function POST(request: Request) {
  try {
  const user = await requireRole(["ADMIN"]);
  const parsed = manualSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const result = await manualCheckInGuest({ ...parsed.data, userId: user.id, operationId: `manual_${nanoid(20)}` });
  return NextResponse.json(result, { status: result.status === "green" ? 200 : 409 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
  const user = await requireRole(["ADMIN"]);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Не указан id прохода" }, { status: 400 });
  const result = await cancelCheckIn(id, user.id);
  if (!result) return NextResponse.json({ error: "Проход не найден" }, { status: 404 });
  return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
