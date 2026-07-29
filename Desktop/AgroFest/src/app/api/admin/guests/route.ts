import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { createGuest } from "@/lib/guests";

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await createGuest({ ...(await request.json()), source: "admin" });
    return NextResponse.json({ id: result.guest.id, registrationNumber: result.guest.registrationNumber, createdBy: user.id });
  } catch (error) {
    return authErrorResponse(error);
  }
}
