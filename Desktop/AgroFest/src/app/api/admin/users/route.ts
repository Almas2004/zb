import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
  await requireRole(["ADMIN"]);
  const body = await request.json();
  if (body.role === "SCANNER") {
    return NextResponse.json({ error: "Создание пользователей SCANNER отключено" }, { status: 400 });
  }
  const user = await prisma.user.create({
    data: {
      name: body.name,
      login: body.login,
      passwordHash: await hashPassword(body.password),
      role: "ADMIN"
    }
  });
  return NextResponse.json({ id: user.id, login: user.login, role: user.role });
  } catch (error) {
    return authErrorResponse(error);
  }
}
