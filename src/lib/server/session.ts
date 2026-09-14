import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface AdminIdentity {
  id: string;
  username: string;
  name: string;
}

function shouldUseSecureCookie(): boolean {
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function sessionCookieName(): string {
  return shouldUseSecureCookie() ? "__Host-simcrm_admin_session" : "simcrm_admin_session";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.$transaction([
    prisma.adminSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    }),
    prisma.adminSession.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt,
      },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_TTL_SECONDS,
    priority: "high",
  });
}

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || !TOKEN_PATTERN.test(token)) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          role: true,
          username: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    session.user.role !== "ADMIN" ||
    !session.user.isActive ||
    !session.user.username
  ) {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    name: session.user.name,
  };
}

export async function requireAdminPage(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}

export async function deleteCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;

  if (token && TOKEN_PATTERN.test(token)) {
    await prisma.adminSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(sessionCookieName());
}
