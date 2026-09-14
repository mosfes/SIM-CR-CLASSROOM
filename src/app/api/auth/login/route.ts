import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "@/lib/auth-utils";
import { createAdminSession } from "@/lib/server/session";
import {
  clearLoginFailures,
  getClientFingerprint,
  getLoginBlockSeconds,
  recordLoginFailure,
} from "@/lib/server/login-throttle";

const GENERIC_LOGIN_ERROR = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
const USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;
const FALLBACK_HASH = hashPassword("simcrm-invalid-login-placeholder");

function json(
  body: { success: boolean; error?: string },
  status: number,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const expectedOrigin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : request.nextUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json({ success: false, error: "คำขอไม่ผ่านการตรวจสอบความปลอดภัย" }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ success: false, error: "รองรับเฉพาะข้อมูล JSON" }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4_096) {
    return json({ success: false, error: "ข้อมูลเข้าสู่ระบบมีขนาดใหญ่เกินไป" }, 413);
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return json({ success: false, error: GENERIC_LOGIN_ERROR }, 400);
    }

    const { username: rawUsername, password } = body as Record<string, unknown>;
    const username = typeof rawUsername === "string" ? rawUsername.trim().toLowerCase() : "";

    if (
      !USERNAME_PATTERN.test(username) ||
      typeof password !== "string" ||
      password.length < 1 ||
      password.length > 256 ||
      Buffer.byteLength(password, "utf8") > 1_024
    ) {
      return json({ success: false, error: GENERIC_LOGIN_ERROR }, 401);
    }

    const clientFingerprint = getClientFingerprint(request);
    const blockedSeconds = await getLoginBlockSeconds(username, clientFingerprint);
    if (blockedSeconds > 0) {
      return json(
        { success: false, error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่" },
        429,
        { "Retry-After": String(blockedSeconds) }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        role: true,
        password: true,
        isActive: true,
      },
    });

    // Always run scrypt, including when the username does not exist, to reduce timing leaks.
    const fallbackHash = await FALLBACK_HASH;
    const passwordHash = admin?.password ?? fallbackHash;
    const passwordMatches = await verifyPassword(password, passwordHash);
    const canSignIn = Boolean(
      admin && admin.role === "ADMIN" && admin.isActive && admin.password && passwordMatches
    );

    if (!canSignIn || !admin) {
      await recordLoginFailure(username, clientFingerprint);
      return json({ success: false, error: GENERIC_LOGIN_ERROR }, 401);
    }

    if (passwordNeedsRehash(admin.password!)) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: await hashPassword(password) },
      });
    }

    await clearLoginFailures(username, clientFingerprint);
    await createAdminSession(admin.id);

    return json({ success: true }, 200);
  } catch {
    return json({ success: false, error: "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้" }, 500);
  }
}
