import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { checkInTicket } from "@/lib/guests";
import { checkInSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
  const user = await requireRole(["ADMIN", "SCANNER"]);
  const body = await request.json();
  const operations = Array.isArray(body.operations) ? body.operations : [];
  const results = [];
  for (const operation of operations) {
    const parsed = checkInSchema.safeParse(operation);
    if (!parsed.success) {
      results.push({ operationId: operation.operationId, status: "red", message: "Некорректная offline-операция" });
      continue;
    }
    results.push(await checkInTicket({ ...parsed.data, scannerUserId: user.id, mode: "OFFLINE_SYNC" }));
  }
  return NextResponse.json({ results });
  } catch (error) {
    return authErrorResponse(error);
  }
}
