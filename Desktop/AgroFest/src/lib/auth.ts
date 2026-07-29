import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { verifyPassword } from "./crypto";

const cookieName = "agrofest_session";

export class AuthorizationError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function secretKey() {
  const secret = process.env.SESSION_SECRET || "development-only-change-me-change-me";
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 64));
}

export async function createSession(userId: string, role: "ADMIN" | "SCANNER") {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secretKey());
    const user = await prisma.user.findUnique({ where: { id: verified.payload.sub }, select: { id: true, name: true, login: true, role: true, isActive: true } });
    if (!user?.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireRole(roles: Array<"ADMIN" | "SCANNER">) {
  const user = await getSession();
  if (!user || !roles.includes(user.role)) {
    throw new AuthorizationError(user ? "Forbidden" : "Unauthorized", user ? 403 : 401);
  }
  return user;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export async function authenticate(login: string, password: string) {
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}
