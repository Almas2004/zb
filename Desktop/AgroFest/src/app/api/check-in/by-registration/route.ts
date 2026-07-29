import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { checkInRegistrationNumber } from "@/lib/guests";

const schema = z.object({
  registrationNumber: z.string().trim().regex(/^AF26-\d{6}$/i),
  eventDate: z.enum(["2026-07-31", "2026-08-01"]),
  scannerDeviceToken: z.string().min(8).max(160).optional(),
  scannerDeviceName: z.string().max(120).optional(),
  operationId: z.string().min(8).max(120)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "SCANNER"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ status: "red", message: "Введите номер в формате AF26-000001" }, { status: 400 });
    }
    const result = await checkInRegistrationNumber({
      ...parsed.data,
      registrationNumber: parsed.data.registrationNumber.toUpperCase(),
      scannerUserId: user.id,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    });
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
