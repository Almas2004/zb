import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { checkInTicket } from "@/lib/guests";
import { checkInSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
  const user = await requireRole(["ADMIN", "SCANNER"]);
  const parsed = checkInSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ status: "red", message: "Некорректные данные проверки" }, { status: 400 });
  }
  const result = await checkInTicket({
    token: parsed.data.token,
    eventDate: parsed.data.eventDate,
    scannerUserId: user.id,
    scannerDeviceToken: parsed.data.scannerDeviceToken,
    scannerDeviceName: parsed.data.scannerDeviceName,
    operationId: parsed.data.operationId,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  });
  return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
