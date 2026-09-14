import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, type AdminIdentity } from "@/lib/server/session";

type AdminAuthorization =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; response: NextResponse };

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
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

export async function authorizeAdminRequest(
  request: NextRequest,
  options: { csrf?: boolean } = {}
): Promise<AdminAuthorization> {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return { ok: false, response: jsonError("กรุณาเข้าสู่ระบบอีกครั้ง", 401) };
    }

    if (options.csrf && !isSameOrigin(request)) {
      return { ok: false, response: jsonError("คำขอไม่ผ่านการตรวจสอบความปลอดภัย", 403) };
    }

    if (
      options.csrf &&
      request.method !== "DELETE" &&
      !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")
    ) {
      return { ok: false, response: jsonError("รองรับเฉพาะข้อมูล JSON", 415) };
    }

    return { ok: true, admin };
  } catch {
    return { ok: false, response: jsonError("ไม่สามารถตรวจสอบสิทธิ์ได้", 503) };
  }
}
