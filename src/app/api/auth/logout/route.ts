import { NextRequest, NextResponse } from "next/server";
import { deleteCurrentAdminSession } from "@/lib/server/session";

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
    return NextResponse.json(
      { success: false, error: "คำขอไม่ผ่านการตรวจสอบความปลอดภัย" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await deleteCurrentAdminSession();
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store", "Clear-Site-Data": '"cache"' } }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "ไม่สามารถออกจากระบบได้ในขณะนี้" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
