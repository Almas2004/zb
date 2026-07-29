import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await requireRole(["ADMIN"]);
  const { id } = await params;
  const body = await request.json();
  const before = await prisma.guest.findUnique({ where: { id } });
  const guest = await prisma.guest.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      category: body.category,
      status: body.status,
      adminComment: body.adminComment
    }
  });
  await prisma.auditLog.create({ data: { userId: user.id, action: "GUEST_UPDATE", entityType: "Guest", entityId: id, before: before as object, after: guest as object } });
  return NextResponse.json(guest);
  } catch (error) {
    return authErrorResponse(error);
  }
}
